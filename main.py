"""
AI Guardian v2.0 — Main Entry Point
FastAPI + MJPEG stream + Telegram bot + Detector
"""

import os
# Suppress MSMF warnings and fix grab errors on Windows — must be set before cv2 import
os.environ["OPENCV_LOG_LEVEL"] = "SILENT"
os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"

import asyncio
import json
import time
import threading
import subprocess
import cv2
import numpy as np
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from detector import PoseViolenceDetector
import bot as tg_bot

# ── globals ─────────────────────────────────────────

CONFIG_FILE = "config.json"
detector: PoseViolenceDetector | None = None
cap: cv2.VideoCapture | None = None
_last_frame: np.ndarray | None = None
_last_processed: np.ndarray | None = None
_lock = threading.Lock()
_running = False
_frame_id = 0
_config = {}
_start_time: float = 0.0


def load_config() -> dict:
    default = {
        "camera_source": 0,
        "confidence_threshold": 0.5,
        "alert_cooldown": 3,
        "telegram_token": os.environ.get("TELEGRAM_TOKEN", ""),
        "telegram_chat_id": os.environ.get("TELEGRAM_CHAT_ID", ""),
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return {**default, **json.load(f)}
        except Exception:
            pass
    return default


def save_config(cfg: dict):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(cfg, f, indent=4)


# ── camera + detector threads ───────────────────────


# ── FFmpeg MJPEG capture (bypasses OpenCV's broken FOURCC negotiation) ───

class FFmpegCapture:
    """Drop-in cv2.VideoCapture replacement that forces MJPEG via FFmpeg."""

    def __init__(self, device_name: str, width=1280, height=720, fps=30):
        self.w, self.h, self.fps_val = width, height, fps
        self._frame_bytes = width * height * 3
        cmd = [
            'ffmpeg', '-hide_banner', '-loglevel', 'error',
            '-f', 'dshow',
            '-threads', '2',
            '-video_size', f'{width}x{height}',
            '-vcodec', 'mjpeg',
            '-framerate', str(fps),
            '-rtbufsize', '100M',
            '-i', f'video={device_name}',
            '-f', 'rawvideo',
            '-pix_fmt', 'bgr24',
            'pipe:1',
        ]
        self._proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            bufsize=self._frame_bytes * 3,
        )

    def read(self):
        raw = self._proc.stdout.read(self._frame_bytes)
        if len(raw) < self._frame_bytes:
            return False, None
        frame = np.frombuffer(raw, np.uint8).reshape((self.h, self.w, 3))
        return True, frame.copy()

    def isOpened(self):
        return self._proc.poll() is None

    def release(self):
        self._proc.terminate()
        try:
            self._proc.wait(timeout=3)
        except Exception:
            self._proc.kill()

    def get(self, prop):
        if prop == cv2.CAP_PROP_FRAME_WIDTH:
            return float(self.w)
        if prop == cv2.CAP_PROP_FRAME_HEIGHT:
            return float(self.h)
        if prop == cv2.CAP_PROP_FPS:
            return float(self.fps_val)
        if prop == cv2.CAP_PROP_FOURCC:
            return float(cv2.VideoWriter_fourcc(*'MJPG'))
        return 0.0

    def set(self, prop, value):
        return False


def _find_dshow_device() -> str | None:
    """Find first DirectShow video device name via ffmpeg."""
    try:
        r = subprocess.run(
            ['ffmpeg', '-hide_banner', '-list_devices', 'true',
             '-f', 'dshow', '-i', 'dummy'],
            capture_output=True, text=True, timeout=5,
        )
        # Device lines look like: [dshow ...] "USB Camera" (video)
        # or: [dshow ...]  "USB Camera"
        # followed by [dshow ...]  "Alternative name"
        in_video = False
        for line in r.stderr.splitlines():
            if '(video)' in line.lower():
                in_video = True
            elif '(audio)' in line.lower():
                in_video = False
            if in_video and '"' in line:
                parts = line.split('"')
                if len(parts) >= 2:
                    name = parts[1]
                    # Skip "Alternative name" entries and @device_ entries
                    if name and not name.startswith('@device_'):
                        return name
    except Exception:
        pass
    return None


# ── shared state ─────────────────────────────────────

# Shared between capture and process threads
_raw_frame = None
_raw_lock = threading.Lock()
_new_frame_event = threading.Event()

# Pre-encoded JPEG cache for web stream (avoids encoding in web generator)
_cached_jpeg: bytes | None = None
_cached_jpeg_id: int = -1
_jpeg_lock = threading.Lock()
_frame_ready_event = threading.Event()   # signals new processed frame
_jpeg_ready_event = threading.Event()    # signals new JPEG ready for web


def _capture_thread(cam_src, is_stream, is_file):
    """Read frames from camera as fast as it delivers them."""
    global _running, cap, _raw_frame

    consecutive_failures = 0
    MAX_FAILURES = 30
    _cap_time = 0.0
    _cap_n = 0

    # For video files: limit to native FPS so playback isn't sped up
    file_fps = cap.get(cv2.CAP_PROP_FPS) if is_file else 0
    file_delay = 1.0 / max(file_fps, 25) if is_file else 0

    while _running:
        t_start = time.time()
        t_read_start = time.perf_counter()
        ret, frame = cap.read()
        t_read_end = time.perf_counter()
        if not ret:
            consecutive_failures += 1

            # Video file — stop after single playthrough
            if is_file:
                print("Video file processing complete")
                break

            # Webcam or RTSP stream — reconnect after too many failures
            if consecutive_failures > MAX_FAILURES:
                print(f"Camera lost. Attempting reconnect to {cam_src}...")
                cap.release()
                time.sleep(2.0)
                if isinstance(cam_src, int):
                    # Try FFmpeg MJPEG reconnect first
                    device_name = _find_dshow_device()
                    if device_name:
                        try:
                            cap = FFmpegCapture(device_name, 1280, 720, 30)
                            time.sleep(0.5)
                            if cap.isOpened():
                                ret, _ = cap.read()
                                if ret:
                                    print("Reconnected via FFmpeg MJPEG")
                                    consecutive_failures = 0
                                    continue
                            cap.release()
                        except Exception:
                            pass
                    # Fallback to OpenCV
                    cap = cv2.VideoCapture(cam_src, cv2.CAP_DSHOW)
                    if not cap.isOpened():
                        cap = cv2.VideoCapture(cam_src)
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                    cap.set(cv2.CAP_PROP_FPS, 30)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                else:
                    cap = cv2.VideoCapture(cam_src, cv2.CAP_FFMPEG)
                    if not cap.isOpened():
                        cap = cv2.VideoCapture(cam_src)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                consecutive_failures = 0
            time.sleep(0.03)
            continue

        consecutive_failures = 0
        _cap_time += t_read_end - t_read_start
        _cap_n += 1
        if _cap_n >= 30:
            avg_cap = 1000 * _cap_time / _cap_n
            cap_fps = _cap_n / _cap_time
            print(f"[Capture] read={avg_cap:.0f}ms fps={cap_fps:.1f}")
            _cap_time = 0.0
            _cap_n = 0

        with _raw_lock:
            _raw_frame = frame
        _new_frame_event.set()

        # Throttle video file playback to native FPS
        if is_file and file_delay > 0:
            elapsed = time.time() - t_start
            if elapsed < file_delay:
                time.sleep(file_delay - elapsed)


def _process_thread():
    """Pick latest frame, run detector, store result."""
    global _last_frame, _last_processed, _frame_id

    _perf_proc = 0.0
    _perf_n = 0

    while _running:
        # Wait for a new frame from capture thread (up to 100ms)
        _new_frame_event.wait(timeout=0.1)
        _new_frame_event.clear()

        with _raw_lock:
            frame = _raw_frame

        if frame is None:
            continue

        t0 = time.perf_counter()
        processed = detector.process_frame(frame)
        t1 = time.perf_counter()

        with _lock:
            _last_frame = frame
            _last_processed = processed
        _frame_id += 1
        _frame_ready_event.set()

        # Performance timing — print every 30 frames
        _perf_proc += t1 - t0
        _perf_n += 1
        if _perf_n >= 30:
            avg_proc = 1000 * _perf_proc / _perf_n
            eff_fps = _perf_n / _perf_proc
            print(f"[Perf] proc={avg_proc:.0f}ms fps={eff_fps:.1f}")
            _perf_proc = 0.0
            _perf_n = 0


def _encode_thread():
    """Encode processed frames to JPEG for web stream in a separate thread."""
    global _cached_jpeg, _cached_jpeg_id
    last_fid = -1
    skip_count = 0
    while _running:
        _frame_ready_event.wait(timeout=0.1)
        _frame_ready_event.clear()

        skip_count += 1
        if skip_count % 2 != 0:   # encode every 2nd frame = ~15 FPS web stream
            continue

        with _lock:
            frame = _last_processed
        fid = _frame_id

        if frame is None or fid == last_fid:
            continue
        last_fid = fid

        web_frame = cv2.resize(frame, (1280, 720), interpolation=cv2.INTER_LINEAR)
        _, buf = cv2.imencode('.jpg', web_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        with _jpeg_lock:
            _cached_jpeg = buf.tobytes()
            _cached_jpeg_id = fid
        _jpeg_ready_event.set()


def _video_thread():
    global _last_frame, _last_processed, _running, cap, detector, _frame_id

    cam_src = _config.get('camera_source', 0)
    try:
        cam_src = int(cam_src)
    except (ValueError, TypeError):
        pass

    is_stream = isinstance(cam_src, str) and (
        cam_src.lower().startswith("rtsp://") or cam_src.lower().startswith("http")
    )
    is_file = isinstance(cam_src, str) and not is_stream

    # ── Strategy 1: FFmpeg MJPEG for local webcams (bypasses OpenCV FOURCC bug) ──
    cap = None
    if isinstance(cam_src, int):
        device_name = _find_dshow_device()
        if device_name:
            try:
                cap = FFmpegCapture(device_name, 1280, 720, 30)
                time.sleep(0.5)
                if cap.isOpened():
                    ret, test_frame = cap.read()
                    if ret:
                        print(f"Camera opened via FFmpeg MJPEG: {device_name}")
                    else:
                        cap.release()
                        cap = None
                else:
                    cap = None
            except FileNotFoundError:
                print("FFmpeg not found, falling back to OpenCV")
                cap = None
            except Exception as e:
                print(f"FFmpeg failed ({e}), falling back to OpenCV")
                cap = None

    # ── Strategy 2: OpenCV fallback (for webcam if FFmpeg failed, or streams/files) ──
    if cap is None:
        if isinstance(cam_src, int):
            for backend in [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]:
                cap = cv2.VideoCapture(cam_src, backend)
                if cap.isOpened():
                    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                    cap.set(cv2.CAP_PROP_FPS, 30)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    test_ret, _ = cap.read()
                    if test_ret:
                        print(f"Camera opened via OpenCV (backend={backend})")
                        break
                cap.release()
                cap = None
        else:
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|analyzeduration;2000000|probesize;1000000"
            cap = cv2.VideoCapture(cam_src, cv2.CAP_FFMPEG)
            if not cap.isOpened():
                cap = cv2.VideoCapture(cam_src)
            if cap.isOpened():
                src_type = "RTSP stream" if is_stream else "file"
                print(f"Opened {src_type}: {cam_src}")

    if cap is None or not cap.isOpened():
        print(f"ERROR: Cannot open camera {cam_src}")
        _running = False
        return

    # For non-webcam OpenCV sources, set buffer size
    if not isinstance(cam_src, int) and not isinstance(cap, FFmpegCapture):
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    actual_fps = cap.get(cv2.CAP_PROP_FPS)
    fourcc_code = int(cap.get(cv2.CAP_PROP_FOURCC))
    fourcc_str = "".join([chr((fourcc_code >> 8 * i) & 0xFF) for i in range(4)])

    detector = PoseViolenceDetector(_config, log_callback=print)
    detector.on_incident = tg_bot.send_alert

    print(f"Camera started: {actual_w}x{actual_h} @ {actual_fps:.0f}fps codec={fourcc_str}")

    # Launch parallel threads: capture reads frames, process runs YOLO, encode prepares web JPEG
    cap_t = threading.Thread(target=_capture_thread, args=(cam_src, is_stream, is_file), daemon=True)
    proc_t = threading.Thread(target=_process_thread, daemon=True)
    enc_t = threading.Thread(target=_encode_thread, daemon=True)
    cap_t.start()
    proc_t.start()
    enc_t.start()

    # Wait for all to finish (they run until _running = False)
    cap_t.join()
    proc_t.join()
    enc_t.join()

    cap.release()
    print("Camera released")


def start_pipeline():
    global _running
    _running = True
    t = threading.Thread(target=_video_thread, daemon=True)
    t.start()


def stop_pipeline():
    global _running
    _running = False


# ── helpers for bot ─────────────────────────────────

def get_stats() -> dict:
    if detector:
        return detector.get_stats()
    return {}


def get_screenshot() -> str | None:
    with _lock:
        if _last_frame is not None:
            path = f"incidents/_screenshot_{int(time.time())}.jpg"
            cv2.imwrite(path, _last_frame)
            return path
    return None


def set_threshold(val: float):
    if detector:
        detector.confidence_threshold = val
        _config['confidence_threshold'] = val
        save_config(_config)


def save_config_field(key: str, value: str):
    """Callback for bot to save individual config fields."""
    _config[key] = value
    save_config(_config)


# ── FastAPI ─────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _config, _start_time
    _config = load_config()
    save_config(_config)
    _start_time = time.time()

    # start camera
    start_pipeline()

    # start telegram bot
    token = _config.get('telegram_token', '')
    chat_id = _config.get('telegram_chat_id', '')
    if token and chat_id:
        asyncio.create_task(
            tg_bot.start_bot(token, chat_id,
                             get_stats=get_stats,
                             get_screenshot=get_screenshot,
                             set_threshold=set_threshold,
                             save_config=save_config_field)
        )
        print("Telegram bot started (polling)")

    yield

    stop_pipeline()
    await tg_bot.stop_bot()


app = FastAPI(title="AI Guardian v2.0", lifespan=lifespan)

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("templates", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
os.makedirs("incidents", exist_ok=True)
app.mount("/incidents_static", StaticFiles(directory="incidents"), name="incidents_static")
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads_static", StaticFiles(directory="uploads"), name="uploads_static")
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/stats")
async def api_stats():
    stats = get_stats()
    stats['uptime'] = time.time() - _start_time
    return JSONResponse(stats)


@app.post("/api/camera")
async def api_camera(request: Request):
    data = await request.json()
    new_source = data.get('source', 0)
    try:
        new_source = int(new_source)
    except (ValueError, TypeError):
        pass
    _config['camera_source'] = new_source
    save_config(_config)
    stop_pipeline()
    await asyncio.sleep(1.0)
    start_pipeline()
    return JSONResponse({"ok": True, "source": str(new_source)})


@app.post("/api/upload")
async def api_upload(file: UploadFile):
    """Upload a video file and return its absolute path for analysis."""
    os.makedirs("uploads", exist_ok=True)
    safe_name = file.filename.replace(" ", "_") if file.filename else "video.mp4"
    # Whitelist: only allow alphanumeric, hyphens, underscores, dots
    import re
    safe_name = re.sub(r'[^\w\-_.]', '', safe_name)[:50]
    if not safe_name or safe_name.startswith('.'):
        safe_name = "video.mp4"
    filepath = os.path.join("uploads", f"{int(time.time())}_{safe_name}")
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    abs_path = os.path.abspath(filepath)
    print(f"Video uploaded: {abs_path} ({len(content) / 1024 / 1024:.1f} MB)")
    return JSONResponse({"ok": True, "path": abs_path, "size_mb": round(len(content) / 1024 / 1024, 1), "upload_url": f"/uploads_static/{os.path.basename(filepath)}"})


@app.post("/api/reset")
async def api_reset():
    """Clear all incidents and reset detector stats for a clean demo."""
    import shutil
    if os.path.exists("incidents"):
        shutil.rmtree("incidents")
    os.makedirs("incidents", exist_ok=True)
    if detector:
        detector.total_incidents = 0
        detector.is_violence = False
        detector.violence_confidence = 0.0
        detector.motion_history.clear()
        detector.pose_history.clear()
        detector._violence_streak = 0
        detector.avg_motion_speed = 0.0
        detector.current_reason = ""
    return JSONResponse({"ok": True, "message": "All incidents cleared, stats reset"})


@app.post("/api/threshold")
async def api_threshold(request: Request):
    """Adjust detection sensitivity on the fly."""
    data = await request.json()
    val = float(data.get("value", 0.65))
    val = max(0.3, min(0.95, val))
    if detector:
        detector.confidence_threshold = val
    return JSONResponse({"ok": True, "threshold": val})


@app.get("/api/camera/status")
async def api_camera_status():
    """Current camera info."""
    source = _config.get('camera_source', 0)
    is_connected = cap is not None and cap.isOpened() if cap else False
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) if is_connected else 0
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) if is_connected else 0
    cam_fps = cap.get(cv2.CAP_PROP_FPS) if is_connected else 0
    return JSONResponse({
        "source": str(source),
        "connected": is_connected,
        "resolution": f"{w}x{h}" if is_connected else "—",
        "camera_fps": round(cam_fps),
        "type": "RTSP/IP" if isinstance(source, str) and "rtsp" in str(source).lower() else
                "HTTP" if isinstance(source, str) and "http" in str(source).lower() else
                "Webcam" if isinstance(source, int) else "File/Stream",
    })


@app.post("/api/telegram/test")
async def api_telegram_test():
    """Send a test message to verify Telegram bot works."""
    try:
        result = await tg_bot.send_test_message()
        return JSONResponse({"ok": result, "message": "Test alert sent!" if result else "Failed to send"})
    except Exception as e:
        return JSONResponse({"ok": False, "message": str(e)})


@app.get("/api/telegram/info")
async def api_telegram_info():
    """Get Telegram bot info (username, connection status)."""
    info = await tg_bot.get_bot_info()
    return JSONResponse(info)


@app.post("/api/incidents/clear")
async def api_clear_incidents():
    """Clear all saved incidents."""
    import glob
    files = glob.glob("incidents/incident_*.jpg") + glob.glob("incidents/_screenshot_*.jpg")
    count = len(files)
    for f in files:
        try:
            os.remove(f)
        except Exception:
            pass
    if detector:
        detector.total_incidents = 0
    return JSONResponse({"ok": True, "cleared": count})


@app.get("/api/incidents")
async def api_incidents():
    """List all saved incident images with metadata."""
    import glob
    files = sorted(glob.glob("incidents/incident_*.jpg"), reverse=True)
    items = []
    for f in files:
        fname = os.path.basename(f)
        # Parse timestamp from filename: incident_20260214_152308.jpg
        ts_part = fname.replace("incident_", "").replace(".jpg", "")
        try:
            dt = datetime.strptime(ts_part, "%Y%m%d_%H%M%S")
            timestamp = dt.strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            timestamp = ts_part
        items.append({
            "id": fname.replace(".jpg", ""),
            "filename": fname,
            "timestamp": timestamp,
            "image_url": f"/incidents_static/{fname}",
        })
    return JSONResponse({"incidents": items, "total": len(items)})


@app.get("/api/settings")
async def api_get_settings():
    """Return all current settings."""
    return JSONResponse({
        "confidence_threshold": _config.get("confidence_threshold", 0.5),
        "alert_cooldown": _config.get("alert_cooldown", 3),
        "telegram_token": _config.get("telegram_token", ""),
        "telegram_chat_id": _config.get("telegram_chat_id", ""),
        "camera_source": str(_config.get("camera_source", 0)),
    })


@app.post("/api/settings")
async def api_save_settings(request: Request):
    """Save all settings at once."""
    data = await request.json()
    if "confidence_threshold" in data:
        val = float(data["confidence_threshold"])
        _config["confidence_threshold"] = val
        if detector:
            detector.confidence_threshold = val
    if "alert_cooldown" in data:
        val = int(data["alert_cooldown"])
        _config["alert_cooldown"] = val
        if detector:
            detector.alert_cooldown = val
    if "telegram_token" in data:
        _config["telegram_token"] = data["telegram_token"]
    if "telegram_chat_id" in data:
        _config["telegram_chat_id"] = data["telegram_chat_id"]
    save_config(_config)

    # Restart Telegram bot if credentials changed
    token = _config.get("telegram_token", "")
    chat_id = _config.get("telegram_chat_id", "")
    if token and chat_id:
        await tg_bot.stop_bot()
        asyncio.create_task(
            tg_bot.start_bot(token, chat_id,
                             get_stats=get_stats,
                             get_screenshot=get_screenshot,
                             set_threshold=set_threshold,
                             save_config=save_config_field)
        )
        return JSONResponse({"ok": True, "telegram": "Bot started"})

    return JSONResponse({"ok": True})


@app.post("/api/demo")
async def api_demo(request: Request):
    """Toggle demo mode with optimized detection settings."""
    data = await request.json()
    enabled = data.get("enabled", True)
    if detector:
        if enabled:
            detector.confidence_threshold = 0.40
            detector.alert_cooldown = 2
            detector.post_alert_cooldown = 0.5
        else:
            detector.confidence_threshold = _config.get('confidence_threshold', 0.5)
            detector.alert_cooldown = _config.get('alert_cooldown', 3)
            detector.post_alert_cooldown = 1.0
    return JSONResponse({"ok": True, "demo_mode": enabled,
                         "threshold": detector.confidence_threshold if detector else None})


def _mjpeg_gen():
    last_id = -1
    while True:
        _jpeg_ready_event.wait(timeout=0.1)
        _jpeg_ready_event.clear()
        with _jpeg_lock:
            jpeg = _cached_jpeg
            fid = _cached_jpeg_id
        if jpeg is None or fid == last_id:
            continue
        last_id = fid
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg + b'\r\n')


@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(
        _mjpeg_gen(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/api/frame")
async def api_frame():
    """Return latest processed frame as single JPEG (for polling — less GPU pressure than MJPEG)."""
    with _jpeg_lock:
        jpeg = _cached_jpeg
    if jpeg is None:
        return Response(status_code=503)
    return Response(content=jpeg, media_type="image/jpeg",
                    headers={"Cache-Control": "no-cache, no-store",
                             "Pragma": "no-cache"})


# ── run ─────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)