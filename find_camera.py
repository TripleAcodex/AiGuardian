"""
AI Guardian — Camera Discovery Tool
Tries common RTSP URLs for YouSee / Chinese IP cameras.
Run: python find_camera.py
"""

import cv2
import sys
import os
import time

CAMERA_IP = "192.168.1.163"
# Set via environment variable or edit here:
PASSWORD = os.environ.get("CAMERA_PASSWORD", "")

# Common RTSP paths for Chinese IP cameras (Yoosee, Xiaomi, HiSilicon, etc.)
RTSP_PATHS = [
    # No auth
    "/live/ch0",
    "/live/ch00_0",
    "/stream1",
    "/stream2",
    "/ch0_0.264",
    "/cam/realmonitor?channel=1&subtype=0",
    "/onvif1",
    "/onvif2",
    "/media/video1",
    "/video1",
    "/h264_stream",
    "/live",
    "/",
    "/0",
    "/1",
    "/11",
    "/12",
    "/live/main",
    "/live/sub",
    "/livestream/11",
    "/livestream/12",
    "/user=admin_password=_channel=1_stream=0.sdp",
]

# Auth combos to try
AUTH_COMBOS = [
    ("", ""),              # no auth
    ("admin", PASSWORD),   # admin + NVR password
    ("admin", "admin"),
    ("admin", ""),
    ("admin", "123456"),
    ("admin", "888888"),
]

PORTS = [554, 8554, 80, 8080]


def test_rtsp(url: str, timeout: float = 5.0) -> bool:
    """Try connecting to an RTSP URL. Returns True if successful."""
    print(f"  Testing: {url} ...", end=" ", flush=True)
    
    # Set FFMPEG options for faster timeout
    import os
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
        f"rtsp_transport;tcp|analyzeduration;{int(timeout*1000000)}"
        f"|probesize;500000|stimeout;{int(timeout*1000000)}"
    )
    
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    
    start = time.time()
    success = False
    
    if cap.isOpened():
        ret, frame = cap.read()
        elapsed = time.time() - start
        if ret and frame is not None:
            h, w = frame.shape[:2]
            print(f"✓ SUCCESS! {w}x{h} ({elapsed:.1f}s)")
            success = True
        else:
            print(f"✗ opened but no frame ({elapsed:.1f}s)")
    else:
        elapsed = time.time() - start
        print(f"✗ failed ({elapsed:.1f}s)")
    
    cap.release()
    return success


def main():
    print("=" * 60)
    print("AI Guardian — Camera Discovery")
    print(f"Target IP: {CAMERA_IP}")
    print(f"Password:  {'*' * len(PASSWORD) if PASSWORD else '(empty — set PASSWORD in script!)'}")
    print("=" * 60)
    
    if not PASSWORD:
        print("\n⚠ WARNING: Set your NVR password in the script!")
        print("  Open find_camera.py and set PASSWORD = 'your_password'\n")
    
    # First, check if camera is reachable
    print("\n[1] Checking if camera is reachable...")
    import subprocess
    try:
        result = subprocess.run(
            ["ping", "-n", "1", "-w", "2000", CAMERA_IP],
            capture_output=True, text=True, timeout=5
        )
        if "TTL=" in result.stdout:
            print(f"  ✓ Camera {CAMERA_IP} is reachable (ping OK)")
        else:
            print(f"  ⚠ Camera {CAMERA_IP} does not respond to ping")
            print("    This is NORMAL — many IP cameras block ICMP.")
            print("    Continuing to test RTSP...")
    except Exception as e:
        print(f"  Ping error: {e} — continuing anyway...")
    
    # Try HTTP access (web interface)
    print("\n[2] Checking web interface...")
    for port in [80, 8080]:
        url = f"http://{CAMERA_IP}:{port}"
        try:
            import urllib.request
            req = urllib.request.Request(url, method='HEAD')
            resp = urllib.request.urlopen(req, timeout=3)
            print(f"  ✓ Web interface found: {url} (status {resp.status})")
        except Exception:
            print(f"  ✗ No web interface on port {port}")

    # Try ONVIF discovery
    print("\n[3] Trying ONVIF probe (port 80)...")
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((CAMERA_IP, 80))
        sock.close()
        if result == 0:
            print(f"  ✓ Port 80 open — ONVIF likely available")
        else:
            print(f"  ✗ Port 80 closed")
    except Exception:
        pass
    
    for port in PORTS:
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex((CAMERA_IP, port))
            sock.close()
            if result == 0:
                print(f"  ✓ Port {port} open")
        except Exception:
            pass
    
    # Try RTSP URLs
    print("\n[4] Testing RTSP URLs...")
    found = []
    
    for port in PORTS:
        for user, pwd in AUTH_COMBOS:
            for path in RTSP_PATHS:
                if user:
                    url = f"rtsp://{user}:{pwd}@{CAMERA_IP}:{port}{path}"
                else:
                    url = f"rtsp://{CAMERA_IP}:{port}{path}"
                
                if test_rtsp(url, timeout=4.0):
                    found.append(url)
                    # Don't test more paths for this auth combo if we found one
                    break
            
            if found:
                break
        if found:
            break
    
    # Summary
    print("\n" + "=" * 60)
    if found:
        print("✓ FOUND WORKING RTSP URL(S):")
        for url in found:
            print(f"  {url}")
        print(f"\nUse this in the dashboard 'Add Camera' → IP Camera tab")
        print(f"Or set in config.json: \"camera_source\": \"{found[0]}\"")
    else:
        print("✗ No working RTSP URL found.")
        print("\nPossible reasons:")
        print("  1. Camera doesn't support RTSP (P2P-only model)")
        print("  2. RTSP is disabled in camera settings")
        print("  3. Wrong password — check NVR password in YouSee app")
        print("  4. Non-standard RTSP path — check camera documentation")
        print("\nTry:")
        print(f"  1. Open http://{CAMERA_IP} in a browser")
        print(f"  2. In YouSee app: Settings → NVR Connection → check password")
        print(f"  3. Try VLC: Media → Open Network Stream → rtsp://{CAMERA_IP}:554/")
    print("=" * 60)


if __name__ == "__main__":
    main()
