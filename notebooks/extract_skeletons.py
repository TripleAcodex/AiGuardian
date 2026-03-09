"""
AI Guardian — Multi-Dataset Skeleton Extractor
Extracts and converts pose skeletons for LSTM/ST-GCN training.

Supports:
  1. RWF-2000    — video → YOLO-pose → skeletons (GPU accelerated)
  2. NTU RGB+D   — .skeleton files → remap 25 joints → 17 COCO joints
  3. UBI-Fights  — video → YOLO-pose → skeletons (same as RWF-2000)
  4. Any video folder with Fight/NonFight subfolders

Usage:
    # RWF-2000 or UBI-Fights (video-based, uses YOLO + GPU):
    python extract_skeletons.py --input path/to/RWF-2000 --output skeletons/rwf --mode video

    # NTU RGB+D (.skeleton files):
    python extract_skeletons.py --input path/to/nturgbd_skeletons --output skeletons/ntu --mode ntu

    # Merge all into one training set:
    python extract_skeletons.py --merge skeletons/rwf skeletons/ntu --output skeletons/combined
"""

import argparse
import json
import os
import struct
import sys
import time
import cv2
import numpy as np
from pathlib import Path

# ── Config ──────────────────────────────────────────
SEQUENCE_LEN = 30       # frames per clip
MAX_PEOPLE = 2           # max persons per frame
NUM_KEYPOINTS = 17       # COCO keypoints
FEATURES_PER_KP = 3      # x_norm, y_norm, confidence
FEATURE_DIM = MAX_PEOPLE * NUM_KEYPOINTS * FEATURES_PER_KP  # 102
YOLO_MODEL = "yolo11n-pose.pt"
YOLO_CONF = 0.4

# NTU RGB+D 25-joint → COCO 17-joint mapping
# NTU: 0=base_spine 1=mid_spine 2=neck 3=head 4=l_shoulder 5=l_elbow
#      6=l_wrist 7=l_hand 8=r_shoulder 9=r_elbow 10=r_wrist 11=r_hand
#      12=l_hip 13=l_knee 14=l_ankle 15=l_foot 16=r_hip 17=r_knee
#      18=r_ankle 19=r_foot 20=spine 21=l_hand_tip 22=l_thumb
#      23=r_hand_tip 24=r_thumb
# COCO: 0=nose 1=l_eye 2=r_eye 3=l_ear 4=r_ear 5=l_shoulder 6=r_shoulder
#       7=l_elbow 8=r_elbow 9=l_wrist 10=r_wrist 11=l_hip 12=r_hip
#       13=l_knee 14=r_knee 15=l_ankle 16=r_ankle
NTU_TO_COCO = {
    0: 3,   # nose ← head
    1: 3,   # l_eye ← head (approximation)
    2: 3,   # r_eye ← head
    3: 3,   # l_ear ← head
    4: 3,   # r_ear ← head
    5: 4,   # l_shoulder
    6: 8,   # r_shoulder
    7: 5,   # l_elbow
    8: 9,   # r_elbow
    9: 6,   # l_wrist
    10: 10,  # r_wrist
    11: 12,  # l_hip
    12: 16,  # r_hip
    13: 13,  # l_knee
    14: 17,  # r_knee
    15: 14,  # l_ankle
    16: 18,  # r_ankle
}

# NTU action classes related to violence (NTU 60 + NTU 120 expansion)
NTU_VIOLENCE_ACTIONS = {
    50: "punch/slap",
    51: "kicking",
    52: "pushing",
    53: "pat_on_back",       # hard negative (close contact)
    54: "point_finger",      # hard negative (raised hand)
    55: "hugging",           # hard negative (close but not violence)
    56: "touch_pocket",      # negative (similar motion)
    57: "handshaking",       # negative
    58: "giving_object",     # negative (close proximity)
    59: "walking_towards",   # negative
    60: "walking_apart",     # negative
    # NTU 120 expansion
    63: "nod_head_bow",      # negative (close interaction)
    99: "grab_stuff",        # negative (hand motion near person)
    106: "hit_with_object",  # violence
    108: "knock_over",       # violence
    112: "high_five",        # negative (fast hand motion toward person)
}
NTU_FIGHT_CLASSES = {50, 51, 52, 106, 108}
NTU_NORMAL_CLASSES = {53, 54, 55, 56, 57, 58, 59, 60, 63, 99, 112}


# ══════════════════════════════════════════════════════
# MODE 1: Video-based extraction (RWF-2000, UBI-Fights)
# ══════════════════════════════════════════════════════

def extract_from_video(model, video_path: str, device: str) -> np.ndarray | None:
    """Extract skeleton sequence from video using YOLO-pose on GPU."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames < 5:
        cap.release()
        return None

    frame_indices = np.linspace(0, total_frames - 1, SEQUENCE_LEN, dtype=int)
    all_features = []
    use_half = device != "cpu"

    for idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            all_features.append(np.zeros(FEATURE_DIM, dtype=np.float32))
            continue

        all_features.append(_extract_frame_features(model, frame, device, use_half))

    cap.release()
    return np.array(all_features, dtype=np.float32)


def extract_from_video_sliding_window(model, video_path: str, device: str,
                                       stride: int = 10) -> list[np.ndarray]:
    """Extract multiple overlapping skeleton clips via sliding window.

    For short videos (1-2 sec), this produces multiple training samples
    instead of just one. Each clip is (SEQUENCE_LEN, FEATURE_DIM).

    Args:
        stride: step size in frames between windows (default 10).
                Smaller stride = more clips but more overlap.

    Returns:
        List of (30, 102) numpy arrays. Empty list on failure.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return []

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames < 5:
        cap.release()
        return []

    use_half = device != "cpu"

    # Read ALL frames and extract keypoints for each
    all_frame_features = []
    for _ in range(total_frames):
        ret, frame = cap.read()
        if not ret:
            break
        all_frame_features.append(_extract_frame_features(model, frame, device, use_half))

    cap.release()

    n = len(all_frame_features)
    if n == 0:
        return []

    # If video is shorter than SEQUENCE_LEN, loop-pad to SEQUENCE_LEN
    if n < SEQUENCE_LEN:
        padded = []
        for i in range(SEQUENCE_LEN):
            padded.append(all_frame_features[i % n])
        return [np.array(padded, dtype=np.float32)]

    # Sliding window: generate overlapping clips
    clips = []
    for start in range(0, n - SEQUENCE_LEN + 1, stride):
        clip = all_frame_features[start:start + SEQUENCE_LEN]
        clips.append(np.array(clip, dtype=np.float32))

    # Always include the last window if not already covered
    if (n - SEQUENCE_LEN) % stride != 0:
        clip = all_frame_features[n - SEQUENCE_LEN:]
        clips.append(np.array(clip, dtype=np.float32))

    return clips


def _extract_frame_features(model, frame: np.ndarray, device: str,
                             use_half: bool) -> np.ndarray:
    """Extract (FEATURE_DIM,) skeleton feature vector from a single frame."""
    h, w = frame.shape[:2]
    results = model(frame, verbose=False, conf=YOLO_CONF, imgsz=640, half=use_half)

    frame_kps = []
    if results[0].keypoints is not None and len(results[0].keypoints) > 0:
        kp_data = results[0].keypoints.data.cpu().numpy()
        for person_kp in kp_data:
            if len(person_kp) == 0:
                continue
            normalized = person_kp.copy()
            normalized[:, 0] /= w
            normalized[:, 1] /= h
            frame_kps.append(normalized.flatten())

    while len(frame_kps) < MAX_PEOPLE:
        frame_kps.append(np.zeros(NUM_KEYPOINTS * FEATURES_PER_KP, dtype=np.float32))
    frame_kps = frame_kps[:MAX_PEOPLE]

    # Sort left-to-right for consistency
    if len(frame_kps) >= 2:
        kp0 = frame_kps[0].reshape(NUM_KEYPOINTS, FEATURES_PER_KP)
        kp1 = frame_kps[1].reshape(NUM_KEYPOINTS, FEATURES_PER_KP)
        v0 = kp0[kp0[:, 2] > 0.3]
        v1 = kp1[kp1[:, 2] > 0.3]
        c0 = np.mean(v0[:, 0]) if len(v0) > 0 else 0.5
        c1 = np.mean(v1[:, 0]) if len(v1) > 0 else 0.5
        if c0 > c1:
            frame_kps[0], frame_kps[1] = frame_kps[1], frame_kps[0]

    return np.concatenate(frame_kps)


def process_video_dataset(input_dir: str, output_dir: str,
                          sliding_window: bool = False, stride: int = 10):
    """Process RWF-2000 / UBI-Fights (video-based).

    Args:
        sliding_window: if True, extract overlapping clips (for short videos).
        stride: frame stride for sliding window mode.
    """
    import torch
    from ultralytics import YOLO

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device.upper()}")
    if device == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")

    print(f"Loading YOLO model: {YOLO_MODEL}")
    model = YOLO(YOLO_MODEL)
    model.to(device)
    if device == "cuda":
        # Warm up GPU
        dummy = np.zeros((480, 640, 3), dtype=np.uint8)
        model(dummy, verbose=False, imgsz=640, half=True)
        print("GPU warm-up done, FP16 enabled")
    print("Model loaded.")

    input_path = Path(input_dir)
    output_path = Path(output_dir)
    stats = {"total": 0, "processed": 0, "failed": 0, "source": "video"}

    splits = []
    for s in ["train", "val", "test"]:
        d = input_path / s
        if d.exists():
            splits.append((s, d))
    if not splits:
        splits = [("train", input_path)]

    for split_name, split_dir in splits:
        for class_dir in sorted(split_dir.iterdir()):
            if not class_dir.is_dir():
                continue
            cn = class_dir.name.lower()
            label = "fight" if ("fight" in cn and "non" not in cn) else "nonfight"

            out_dir = output_path / split_name / label
            out_dir.mkdir(parents=True, exist_ok=True)

            videos = sorted([
                f for f in class_dir.iterdir()
                if f.suffix.lower() in ('.avi', '.mp4', '.mkv', '.mov', '.wmv')
            ])
            print(f"\n[{split_name}/{label}] {len(videos)} videos")

            for i, vf in enumerate(videos):
                stats["total"] += 1

                if sliding_window:
                    # Check if any window clips already exist
                    existing = list(out_dir.glob(f"{vf.stem}_win*.npy"))
                    if existing:
                        stats["processed"] += 1
                        continue

                    clips = extract_from_video_sliding_window(model, str(vf), device, stride)
                    if clips:
                        for ci, clip in enumerate(clips):
                            np.save(str(out_dir / f"{vf.stem}_win{ci}.npy"), clip)
                        stats["processed"] += 1
                        if (i + 1) % 20 == 0 or i == len(videos) - 1:
                            print(f"  [{i+1}/{len(videos)}] {vf.stem}: {len(clips)} clips  ok={stats['processed']} fail={stats['failed']}")
                    else:
                        stats["failed"] += 1
                else:
                    out_file = out_dir / f"{vf.stem}.npy"
                    if out_file.exists():
                        stats["processed"] += 1
                        continue

                    features = extract_from_video(model, str(vf), device)
                    if features is not None:
                        np.save(str(out_file), features)
                        stats["processed"] += 1
                    else:
                        stats["failed"] += 1

                    if (i + 1) % 20 == 0 or i == len(videos) - 1:
                        print(f"  [{i+1}/{len(videos)}] ok={stats['processed']} fail={stats['failed']}")

    _save_meta(output_path, stats)


# ══════════════════════════════════════════════════════
# MODE 2: NTU RGB+D skeleton files
# ══════════════════════════════════════════════════════

def parse_ntu_skeleton(filepath: str) -> list:
    """
    Parse NTU RGB+D .skeleton file.
    Returns list of frames, each frame = list of bodies,
    each body = np.array(25, 3) with (x, y, z).
    """
    frames = []
    with open(filepath, 'r') as f:
        num_frames = int(f.readline().strip())
        for _ in range(num_frames):
            num_bodies = int(f.readline().strip())
            bodies = []
            for _ in range(num_bodies):
                # Body info line (skip)
                _ = f.readline()
                num_joints = int(f.readline().strip())
                joints = np.zeros((num_joints, 3), dtype=np.float32)
                for j in range(num_joints):
                    parts = f.readline().strip().split()
                    joints[j] = [float(parts[0]), float(parts[1]), float(parts[2])]
                bodies.append(joints)
            frames.append(bodies)
    return frames


def ntu_to_coco_skeleton(ntu_joints_25: np.ndarray) -> np.ndarray:
    """
    Convert NTU 25-joint to COCO 17-joint format.
    Input: (25, 3) with (x, y, z) in meters
    Output: (17, 3) with (x_norm, y_norm, confidence=1.0)
    """
    coco = np.zeros((17, 3), dtype=np.float32)
    for coco_idx, ntu_idx in NTU_TO_COCO.items():
        pt = ntu_joints_25[ntu_idx]
        # NTU uses meters, normalize to [0,1] range approximately
        # Typical range: x ∈ [-1.5, 1.5], y ∈ [-0.5, 1.5]
        coco[coco_idx, 0] = (pt[0] + 1.5) / 3.0  # x normalized
        coco[coco_idx, 1] = (pt[1] + 0.5) / 2.0  # y normalized (inverted for image coords)
        coco[coco_idx, 2] = 1.0  # NTU always has all joints → high confidence
    return coco


def get_ntu_action_class(filename: str) -> int:
    """Extract action class from NTU filename. Format: SsssCcccPpppRrrrAaaa"""
    # e.g., S001C001P001R001A050.skeleton → action 50
    try:
        name = Path(filename).stem
        a_idx = name.find('A')
        if a_idx >= 0:
            return int(name[a_idx+1:a_idx+4])
    except:
        pass
    return -1


def process_ntu_dataset(input_dir: str, output_dir: str):
    """Process NTU RGB+D .skeleton files."""
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    stats = {"total": 0, "processed": 0, "failed": 0, "skipped_class": 0, "source": "ntu"}

    # Find all .skeleton files
    skeleton_files = sorted(input_path.rglob("*.skeleton"))
    print(f"Found {len(skeleton_files)} .skeleton files")

    for i, sf in enumerate(skeleton_files):
        action = get_ntu_action_class(sf.name)

        # Filter to relevant classes only
        if action in NTU_FIGHT_CLASSES:
            label = "fight"
        elif action in NTU_NORMAL_CLASSES:
            label = "nonfight"
        else:
            stats["skipped_class"] += 1
            continue

        stats["total"] += 1
        out_dir = output_path / "train" / label
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / f"{sf.stem}.npy"

        if out_file.exists():
            stats["processed"] += 1
            continue

        try:
            frames = parse_ntu_skeleton(str(sf))
            if len(frames) < 5:
                stats["failed"] += 1
                continue

            # Sample SEQUENCE_LEN frames evenly
            indices = np.linspace(0, len(frames) - 1, SEQUENCE_LEN, dtype=int)
            all_features = []

            for idx in indices:
                bodies = frames[idx]
                frame_kps = []

                for body in bodies[:MAX_PEOPLE]:
                    if len(body) >= 25:
                        coco_kp = ntu_to_coco_skeleton(body)
                        frame_kps.append(coco_kp.flatten())

                while len(frame_kps) < MAX_PEOPLE:
                    frame_kps.append(np.zeros(NUM_KEYPOINTS * FEATURES_PER_KP, dtype=np.float32))
                frame_kps = frame_kps[:MAX_PEOPLE]

                # Sort people left-to-right by X centroid (must match video extraction & inference)
                if len(frame_kps) >= 2:
                    kp0 = frame_kps[0].reshape(NUM_KEYPOINTS, FEATURES_PER_KP)
                    kp1 = frame_kps[1].reshape(NUM_KEYPOINTS, FEATURES_PER_KP)
                    vis0 = kp0[kp0[:, 2] > 0.3]
                    vis1 = kp1[kp1[:, 2] > 0.3]
                    cx0 = np.mean(vis0[:, 0]) if len(vis0) > 0 else 0.5
                    cx1 = np.mean(vis1[:, 0]) if len(vis1) > 0 else 0.5
                    if cx0 > cx1:
                        frame_kps[0], frame_kps[1] = frame_kps[1], frame_kps[0]

                all_features.append(np.concatenate(frame_kps))

            result = np.array(all_features, dtype=np.float32)
            np.save(str(out_file), result)
            stats["processed"] += 1

        except Exception as e:
            stats["failed"] += 1
            if i < 5:
                print(f"  Error: {sf.name}: {e}")

        if (i + 1) % 100 == 0:
            print(f"  [{i+1}/{len(skeleton_files)}] "
                  f"ok={stats['processed']} fail={stats['failed']} skip={stats['skipped_class']}")

    _save_meta(output_path, stats)


# ══════════════════════════════════════════════════════
# MODE 3: Merge datasets
# ══════════════════════════════════════════════════════

def merge_datasets(source_dirs: list, output_dir: str):
    """Merge multiple skeleton datasets into one combined dataset."""
    output_path = Path(output_dir)
    total = 0

    for src in source_dirs:
        src_path = Path(src)
        if not src_path.exists():
            print(f"SKIP: {src} not found")
            continue

        print(f"\nMerging from: {src}")
        for npy_file in sorted(src_path.rglob("*.npy")):
            rel = npy_file.relative_to(src_path)
            dst = output_path / rel
            dst.parent.mkdir(parents=True, exist_ok=True)

            # Avoid name collisions by prefixing with source name
            src_prefix = src_path.name
            dst = dst.parent / f"{src_prefix}_{dst.name}"

            if not dst.exists():
                data = np.load(str(npy_file))
                # Verify shape
                if data.shape == (SEQUENCE_LEN, FEATURE_DIM):
                    np.save(str(dst), data)
                    total += 1
                else:
                    print(f"  SKIP bad shape {data.shape}: {npy_file}")

    print(f"\nMerged {total} samples into {output_path}")

    # Count per class
    for split in ["train", "val"]:
        split_dir = output_path / split
        if split_dir.exists():
            for cls_dir in sorted(split_dir.iterdir()):
                if cls_dir.is_dir():
                    n = len(list(cls_dir.glob("*.npy")))
                    print(f"  {split}/{cls_dir.name}: {n}")


# ══════════════════════════════════════════════════════
# Utilities
# ══════════════════════════════════════════════════════

def _save_meta(output_path: Path, stats: dict):
    meta = output_path / "metadata.json"
    with open(str(meta), "w") as f:
        json.dump(stats, f, indent=2)
    print(f"\n{'='*50}")
    print(f"DONE: {stats['processed']}/{stats['total']} processed")
    print(f"Feature shape: ({SEQUENCE_LEN}, {FEATURE_DIM})")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="AI Guardian — Multi-Dataset Skeleton Extractor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # RWF-2000 (video → YOLO → skeleton, GPU accelerated):
  python extract_skeletons.py --input RWF-2000/ --output skeletons/rwf --mode video

  # NTU RGB+D (.skeleton files → COCO 17-joint):
  python extract_skeletons.py --input nturgbd_skeletons/ --output skeletons/ntu --mode ntu

  # UBI-Fights (same as video mode):
  python extract_skeletons.py --input UBI-Fights/ --output skeletons/ubi --mode video

  # Short clips with sliding window (multiple clips per video):
  python extract_skeletons.py --input pushs/ --output skeletons/custom --mode video --sliding-window --stride 8

  # Merge all into one:
  python extract_skeletons.py --merge skeletons/rwf skeletons/ntu skeletons/ubi --output skeletons/combined
        """
    )
    parser.add_argument("--input", "-i", help="Input dataset directory")
    parser.add_argument("--output", "-o", default="skeletons", help="Output directory")
    parser.add_argument("--mode", choices=["video", "ntu"], default="video",
                        help="Extraction mode: 'video' (YOLO) or 'ntu' (.skeleton files)")
    parser.add_argument("--merge", nargs="+", help="Merge multiple skeleton dirs into one")
    parser.add_argument("--sliding-window", action="store_true",
                        help="Use sliding window extraction (multiple clips per video, good for short clips)")
    parser.add_argument("--stride", type=int, default=10,
                        help="Frame stride for sliding window (default: 10)")
    args = parser.parse_args()

    start = time.time()

    if args.merge:
        merge_datasets(args.merge, args.output)
    elif args.input:
        if not os.path.exists(args.input):
            print(f"ERROR: {args.input} not found")
            sys.exit(1)
        if args.mode == "ntu":
            process_ntu_dataset(args.input, args.output)
        else:
            process_video_dataset(args.input, args.output,
                                  sliding_window=args.sliding_window,
                                  stride=args.stride)
    else:
        parser.print_help()
        sys.exit(1)

    print(f"Total time: {(time.time() - start)/60:.1f} min")
