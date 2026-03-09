"""
AI Guardian v2.0 — Pose-Based Violence Detector (Core Engine)
Rule-based детекция агрессии через YOLO11n-pose
"""

import cv2
import torch
import numpy as np
import time
import os
import threading
from datetime import datetime
from collections import deque
from ultralytics import YOLO
from classifier import SkeletonClassifier


class PoseViolenceDetector:
    """
    Детектор агрессии на основе анализа поз.

    Логика:
    1. YOLOv8-pose → скелеты людей
    2. Скорость движения рук между кадрами
    3. Расстояние между людьми
    4. Близко + быстрые руки = АГРЕССИЯ
    """

    KEYPOINTS = {
        'nose': 0, 'left_eye': 1, 'right_eye': 2,
        'left_ear': 3, 'right_ear': 4,
        'left_shoulder': 5, 'right_shoulder': 6,
        'left_elbow': 7, 'right_elbow': 8,
        'left_wrist': 9, 'right_wrist': 10,
        'left_hip': 11, 'right_hip': 12,
        'left_knee': 13, 'right_knee': 14,
        'left_ankle': 15, 'right_ankle': 16
    }

    SKELETON_CONNECTIONS = [
        (5, 6), (5, 11), (6, 12), (11, 12),  # torso
        (5, 7), (7, 9), (6, 8), (8, 10),  # arms
        (11, 13), (13, 15), (12, 14), (14, 16),  # legs
    ]

    BODY_KP_INDICES = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]

    def __init__(self, config: dict, log_callback=None):
        self.config = config
        self.log_callback = log_callback

        os.makedirs("incidents", exist_ok=True)

        self.confidence_threshold = config.get('confidence_threshold', 0.45)
        self.alert_cooldown = config.get('alert_cooldown', 3)

        # histories
        self.pose_history: deque = deque(maxlen=10)
        self.motion_history: deque = deque(maxlen=8)

        # state
        self.is_violence = False
        self.violence_confidence = 0.0
        self.last_alert_time = 0.0
        self.post_alert_cooldown = 1.0
        self.total_incidents = 0
        self.person_count = 0
        self.avg_motion_speed = 0.0
        self.current_reason = ""
        self._violence_streak = 0  # consecutive violent frames counter

        # fps
        self.current_fps = 0
        self._fps_counter = 0
        self._fps_start = time.time()

        # alert animation
        self._alert_anim = 0

        # incident callback (for telegram)
        self.on_incident = None  # callable(path, confidence, stats)

        # thread-safe stats access
        self._stats_lock = threading.Lock()

        self._load_model()

        # Level 2: trained classifier (if model exists)
        self.classifier = SkeletonClassifier("models/best_model.pth", device=self.device)
        if self.classifier.available:
            self._log(f"Level 2 {self.classifier._model_type} classifier loaded")
        else:
            self._log("Level 2 not available — using rule-based only")

    def _log(self, msg: str):
        if self.log_callback:
            self.log_callback(msg)
        else:
            print(msg)

    def _load_model(self):
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self._log(f"Device: {self.device.upper()}")

        self.model = YOLO('yolo11n-pose.pt')
        self.model.to(self.device)

        self.use_half = self.device == 'cuda'
        if self.use_half:
            self._log("FP16 enabled")

        self._log("YOLO11n-pose loaded")

    # ── helpers ──────────────────────────────────────────

    def _pose_center(self, kp):
        pts = []
        for idx in [5, 6, 11, 12]:
            if idx < len(kp) and kp[idx][2] > 0.3:
                pts.append(kp[idx][:2])
        if len(pts) >= 2:
            return np.mean(pts, axis=0)
        return None

    def _hands(self, kp):
        h = []
        for idx in [9, 10]:
            if idx < len(kp) and kp[idx][2] > 0.3:
                h.append(kp[idx][:2])
        return h

    def _motion_speed(self, cur, prev):
        """Calculate motion speed matching same person across frames by nearest center."""
        if not prev or not cur:
            return 0.0
        # Build centers for matching same person across frames
        cur_centers = [(i, self._pose_center(kp)) for i, kp in enumerate(cur)]
        prev_centers = [(i, self._pose_center(kp)) for i, kp in enumerate(prev)]
        mx = 0.0
        for ci, cc in cur_centers:
            if cc is None:
                continue
            ch = self._hands(cur[ci])
            if not ch:
                continue
            # Find nearest previous person by center distance
            best_pi, best_dist = None, float('inf')
            for pi, pc in prev_centers:
                if pc is None:
                    continue
                d = float(np.linalg.norm(cc - pc))
                if d < best_dist:
                    best_dist = d
                    best_pi = pi
            if best_pi is None:
                continue
            ph = self._hands(prev[best_pi])
            for c in ch:
                for p in ph:
                    mx = max(mx, float(np.linalg.norm(np.array(c) - np.array(p))))
        return mx

    def _people_distance(self, poses):
        if len(poses) < 2:
            return float('inf')
        centers = [c for kp in poses if (c := self._pose_center(kp)) is not None]
        if len(centers) < 2:
            return float('inf')
        mn = float('inf')
        for i in range(len(centers)):
            for j in range(i + 1, len(centers)):
                mn = min(mn, float(np.linalg.norm(centers[i] - centers[j])))
        return mn

    def _raised_hands(self, kp):
        sy = []
        for idx in [5, 6]:
            if idx < len(kp) and kp[idx][2] > 0.3:
                sy.append(kp[idx][1])
        if not sy:
            return 0
        avg_sy = np.mean(sy)
        count = 0
        for idx in [9, 10]:
            if idx < len(kp) and kp[idx][2] > 0.3:
                if kp[idx][1] < avg_sy - 15:
                    count += 1
        return count

    # ── blur (only for saved images) ────────────────────

    def blur_faces(self, frame, poses):
        for kp in poses:
            head_pts = []
            for idx in [0, 1, 2, 3, 4]:
                if idx < len(kp) and kp[idx][2] > 0.3:
                    head_pts.append(kp[idx][:2])
            if len(head_pts) < 2:
                continue
            head_pts = np.array(head_pts)
            cx, cy = int(np.mean(head_pts[:, 0])), int(np.mean(head_pts[:, 1]))
            r = int(np.max(np.linalg.norm(head_pts - [cx, cy], axis=1)) * 1.8) + 20
            h, w = frame.shape[:2]
            x1, y1 = max(0, cx - r), max(0, cy - r)
            x2, y2 = min(w, cx + r), min(h, cy + r)
            if x2 > x1 and y2 > y1:
                frame[y1:y2, x1:x2] = cv2.GaussianBlur(frame[y1:y2, x1:x2], (51, 51), 30)
        return frame

    # ── main analysis ───────────────────────────────────

    def _avg_shoulder_width(self, poses):
        """Average shoulder width in pixels — used for distance-independent normalization."""
        widths = []
        for kp in poses:
            if 5 < len(kp) and 6 < len(kp) and kp[5][2] > 0.3 and kp[6][2] > 0.3:
                w = float(np.linalg.norm(kp[5][:2] - kp[6][:2]))
                if w > 5:
                    widths.append(w)
        return float(np.mean(widths)) if widths else 80.0

    def _directional_attack_score(self, poses):
        """
        Compute directional hand velocity toward opponent + interaction asymmetry.
        Returns (max_toward_speed, asymmetry) where:
        - toward_speed: projection of hand velocity onto inter-person axis
        - asymmetry: |speed_A - speed_B| / max(speed_A, speed_B)
        """
        if len(poses) < 2 or len(self.pose_history) < 1:
            return 0.0, 0.0

        prev = self.pose_history[-1]
        if not prev or len(prev) < 2:
            return 0.0, 0.0

        # Match current to previous persons by nearest center
        cur_data = [(i, self._pose_center(kp)) for i, kp in enumerate(poses)]
        prev_data = [(i, self._pose_center(kp)) for i, kp in enumerate(prev)]

        # Build person matching: cur_idx -> prev_idx
        matched = {}
        for ci, cc in cur_data:
            if cc is None:
                continue
            best_pi, best_d = None, float('inf')
            for pi, pc in prev_data:
                if pc is None:
                    continue
                d = float(np.linalg.norm(cc - pc))
                if d < best_d:
                    best_d = d
                    best_pi = pi
            if best_pi is not None:
                matched[ci] = best_pi

        max_toward = 0.0
        per_person_speeds = {}

        # For each pair (A, B) — compute directional speed of A's hands toward B
        for ci, cc in cur_data:
            if cc is None or ci not in matched:
                continue
            pi = matched[ci]
            # Get hand velocity: current wrist - previous wrist
            # Match same wrist across frames (avoid cross left-right comparison)
            person_max_speed = 0.0
            hand_velocities = []
            for wrist_idx in [9, 10]:  # left_wrist, right_wrist
                if (wrist_idx < len(poses[ci]) and poses[ci][wrist_idx][2] > 0.3 and
                        wrist_idx < len(prev[pi]) and prev[pi][wrist_idx][2] > 0.3):
                    v = poses[ci][wrist_idx][:2] - prev[pi][wrist_idx][:2]
                    speed = float(np.linalg.norm(v))
                    person_max_speed = max(person_max_speed, speed)
                    hand_velocities.append(v)
            if not hand_velocities:
                continue

            per_person_speeds[ci] = person_max_speed

            # Project hand velocity onto inter-person axis toward each opponent
            for oi, oc in cur_data:
                if oi == ci or oc is None:
                    continue
                inter_axis = oc - cc
                axis_len = float(np.linalg.norm(inter_axis))
                if axis_len < 10:
                    continue
                unit_axis = inter_axis / axis_len

                for v in hand_velocities:
                    toward = float(np.dot(v, unit_axis))
                    if toward > max_toward:
                        max_toward = toward

        # Asymmetry: how different are the hand speeds between people?
        speeds = list(per_person_speeds.values())
        if len(speeds) >= 2:
            s_max = max(speeds)
            s_min = min(speeds)
            # Only compute asymmetry when there's meaningful movement
            if s_max > 15.0:
                asymmetry = (s_max - s_min) / max(s_max, 1.0)
            else:
                asymmetry = 0.0
        else:
            asymmetry = 0.0

        return max_toward, asymmetry

    def _analyze(self, poses, shape):
        if len(poses) < 2:
            self.motion_history.clear()
            self.avg_motion_speed = 0.0
            # Reset L2 EMA when people leave the scene
            if self.classifier.available:
                self.classifier.reset_ema()
            return False, 0.0, "< 2 people"

        h, w = shape[:2]
        dist = self._people_distance(poses)
        nd = dist / max(w, h)
        is_close = nd < 0.25

        if not is_close:
            self.motion_history.clear()
            self.avg_motion_speed = 0.0
            return False, 0.0, f"Far ({nd:.2f})"

        # Raw hand speed between matched persons across frames
        prev = self.pose_history[-1] if self.pose_history else None
        speed = self._motion_speed(poses, prev)

        self.motion_history.append(speed)
        avg = float(np.mean(list(self.motion_history))) if len(self.motion_history) >= 3 else 0
        self.avg_motion_speed = avg

        speed_score = min(1.0, avg / 110.0)

        raised = sum(self._raised_hands(kp) for kp in poses)
        raised_score = min(1.0, raised / 2.0)

        # Directional attack: is a hand moving TOWARD the other person?
        toward, asymmetry = self._directional_attack_score(poses)
        toward_score = min(1.0, toward / 50.0)

        if toward_score > 0.3 and asymmetry > 0.3:
            # Directed aggression detected: full scoring formula
            conf = (toward_score * 0.45 + speed_score * 0.30
                    + raised_score * 0.15 + asymmetry * 0.10)
        else:
            # No directed aggression: require very high speed
            conf = speed_score * 0.60 + raised_score * 0.20 + toward_score * 0.20
            conf *= 0.7  # penalty for lack of directionality

        is_v = conf >= self.confidence_threshold

        parts = [f"Close({nd:.2f})"]
        if speed > 5:
            parts.append(f"Spd({speed:.0f}px)")
        if raised > 0:
            parts.append(f"Hands({raised})")
        if toward > 5:
            parts.append(f"Twd({toward:.0f})")
        if asymmetry > 0.1:
            parts.append(f"Asym({asymmetry:.2f})")

        return is_v, conf, " | ".join(parts)

    # ── save incident (async) ───────────────────────────

    def _save_incident(self, frame, confidence, poses):
        fc = frame.copy()
        pc = [p.copy() for p in poses] if poses else []

        def _do():
            try:
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                path = f"incidents/incident_{ts}.jpg"
                cv2.imwrite(path, fc)
                self._log(f"Incident #{self.total_incidents} saved")
                if self.on_incident:
                    stats = {
                        'camera_id': self.config.get('camera_source', 0),
                        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        'person_count': self.person_count,
                        'motion_speed': self.avg_motion_speed,
                        'total_incidents': self.total_incidents,
                    }
                    self.on_incident(path, confidence, stats)
            except Exception as e:
                self._log(f"Save error: {e}")

        threading.Thread(target=_do, daemon=True).start()

    # ── process frame ───────────────────────────────────

    def process_frame(self, frame):
        # fps
        self._fps_counter += 1
        now = time.time()
        if now - self._fps_start >= 1.0:
            self.current_fps = self._fps_counter
            self._fps_counter = 0
            self._fps_start = now

        # Let YOLO handle resize internally — returns coords in original frame space
        results = self.model(frame, verbose=False, conf=0.5,
                             half=self.use_half, imgsz=480, max_det=10)
        if self.device == 'cuda':
            import torch
            torch.cuda.synchronize()

        poses = []
        if results[0].keypoints is not None and len(results[0].keypoints) > 0:
            kd = results[0].keypoints.data.cpu().numpy()
            for kp in kd:
                if len(kp) > 0:
                    poses.append(kp.copy())

        self.person_count = len(poses)

        is_v, conf, reason = self._analyze(poses, frame.shape)
        self.pose_history.append(poses)
        self.violence_confidence = conf
        self.current_reason = reason

        # Debug: print detection details when 2+ people are close
        if len(poses) >= 2 and conf > 0.05:
            self._log(f"[Det] conf={conf:.2f} reason={reason} streak={self._violence_streak}")

        # Track consecutive violent frames — require sustained signal
        if is_v:
            self._violence_streak += 1
        else:
            self._violence_streak = 0

        # ── Level 2: LSTM classifier (if available) ──
        # Always feed skeleton data to buffer
        if self.classifier.available:
            self.classifier.buffer.add_frame(poses, frame.shape)

        ct = time.time()
        dt = ct - self.last_alert_time

        if dt < self.post_alert_cooldown:
            self.motion_history.clear()
            self.violence_confidence = 0.0
            is_v = False
            self._violence_streak = 0

        # Require at least 2 consecutive violent frames before triggering
        if is_v and self._violence_streak < 2:
            is_v = False

        if is_v and dt > self.alert_cooldown:
            # Level 2 confirmation (if available)
            if self.classifier.available and self.classifier.buffer.is_ready:
                l2_score = self.classifier.predict()
                # Combine: L1 directional + L2 temporal pattern
                combined = conf * 0.5 + l2_score * 0.5
                self.violence_confidence = combined
                model_tag = getattr(self.classifier, '_model_type', 'ML')
                reason_extra = f" | {model_tag}:{l2_score:.0%}"
                self.current_reason = reason + reason_extra
                # L2 veto: if GCN is very confident it's NOT violence
                # and L1 is not extremely sure, suppress the alert
                if l2_score < 0.15 and conf < 0.80:
                    is_v = False
                    self._violence_streak = 0

            if is_v:
                self.is_violence = True
                self.last_alert_time = ct
                self._alert_anim = 0
                self.total_incidents += 1
                self.motion_history.clear()
                self._save_incident(frame, self.violence_confidence, poses)

        return self._draw(frame, poses, reason)

    # ── drawing ─────────────────────────────────────────

    def _draw(self, frame, poses, reason):
        out = frame.copy()

        colors = [(0, 255, 0), (255, 100, 100), (100, 100, 255),
                  (0, 255, 255), (255, 0, 255)]

        for pi, kp in enumerate(poses):
            c = colors[pi % len(colors)]
            for s, e in self.SKELETON_CONNECTIONS:
                if (s < len(kp) and e < len(kp)
                        and kp[s][2] > 0.3 and kp[e][2] > 0.3
                        and (kp[s][0] > 1 or kp[s][1] > 1)
                        and (kp[e][0] > 1 or kp[e][1] > 1)):
                    cv2.line(out,
                             (int(kp[s][0]), int(kp[s][1])),
                             (int(kp[e][0]), int(kp[e][1])), c, 2)
            for idx in self.BODY_KP_INDICES:
                if idx < len(kp) and kp[idx][2] > 0.3 and (kp[idx][0] > 1 or kp[idx][1] > 1):
                    cv2.circle(out, (int(kp[idx][0]), int(kp[idx][1])), 4, c, -1)

        # alert animation — bold red banner for demo visibility
        if self.is_violence and self._alert_anim < 60:
            self._alert_anim += 1
            h, w = out.shape[:2]

            # Pulsing red top banner
            pulse = 0.7 + 0.3 * abs(np.sin(self._alert_anim * 0.15))
            banner_h = 64
            overlay = out.copy()
            cv2.rectangle(overlay, (0, 0), (w, banner_h), (0, 0, 220), -1)
            out = cv2.addWeighted(overlay, pulse, out, 1 - pulse, 0)
            cv2.putText(out, f"VIOLENCE DETECTED ({self.violence_confidence:.0%})",
                        (20, 44), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (255, 255, 255), 3)

            # Red border
            cv2.rectangle(out, (0, 0), (w - 1, h - 1), (0, 0, 255), 4)
        else:
            self.is_violence = False

        return out

    def get_stats(self) -> dict:
        with self._stats_lock:
            return {
                'fps': self.current_fps,
                'person_count': self.person_count,
                'confidence': round(self.violence_confidence, 3),
                'is_violence': self.is_violence or self.violence_confidence >= self.confidence_threshold,
                'motion_speed': round(self.avg_motion_speed, 1),
                'total_incidents': self.total_incidents,
                'reason': self.current_reason,
                'threshold': self.confidence_threshold,
                'lstm_available': self.classifier.available,
                'model_type': getattr(self.classifier, '_model_type', 'none'),
                'lstm_score': round(self.classifier.last_score, 3) if self.classifier.available else None,
            }
