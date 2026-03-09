"""
AI Guardian — Violence Classifier (Level 2)
Trained model for skeleton-based violence detection.
Supports: ViolenceLSTM (legacy) and HPI-GCN-RP (Graph Convolutional Network).

Loaded by detector.py as the "smart" second stage:
  - Level 1 (rule-based): fast, heuristic, runs every frame
  - Level 2 (this): model on 30-frame skeleton sequence, runs only when Level 1 flags

Usage:
    from classifier import SkeletonClassifier
    clf = SkeletonClassifier("models/best_model.pth")
    score = clf.predict(skeleton_buffer)  # 0.0 = safe, 1.0 = violence
"""

import os
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from collections import deque


# ── Model Architecture ────────────────────────────
# Must match what was trained in the Kaggle notebook

class ViolenceLSTM(nn.Module):
    """Bidirectional LSTM for skeleton-sequence violence classification."""

    def __init__(self, input_size=102, hidden_size=128, num_layers=2, dropout=0.3):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size, hidden_size, num_layers,
            batch_first=True, dropout=dropout, bidirectional=True
        )
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size * 2, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 1),
        )

    def forward(self, x):
        # x: (batch, seq_len, features)
        _, (h_n, _) = self.lstm(x)
        # h_n: (num_layers*2, batch, hidden) for bidirectional
        last = torch.cat([h_n[-2], h_n[-1]], dim=1)   # (batch, hidden*2)
        return self.classifier(last).squeeze(-1)       # (batch,)


# ── HPI-GCN-RP Architecture ─────────────────────────
# Human Pose Interaction - Graph Convolutional Network
# with Relation Prediction

def build_coco_adjacency(num_keypoints=17, num_people=2):
    """
    Build 34x34 adjacency matrix for 2-person COCO skeletons.
    Returns: (3, V, V) numpy array — [A_self, A_inward, A_outward].
    """
    V = num_keypoints * num_people  # 34

    # COCO bone connections (undirected)
    intra_edges = [
        (0, 1), (0, 2), (1, 3), (2, 4),       # head
        (5, 6),                                  # shoulders
        (5, 7), (7, 9),                          # left arm
        (6, 8), (8, 10),                         # right arm
        (5, 11), (6, 12),                        # torso sides
        (11, 12),                                # hips
        (11, 13), (13, 15),                      # left leg
        (12, 14), (14, 16),                      # right leg
    ]

    # Full edge list
    edges = []
    for i, j in intra_edges:
        edges.append((i, j))           # Person 1
    for i, j in intra_edges:
        edges.append((i + 17, j + 17)) # Person 2
    for i in range(17):
        edges.append((i, i + 17))      # Inter-person

    # BFS distance from center nodes (nose of each person)
    adj = {i: set() for i in range(V)}
    for i, j in edges:
        adj[i].add(j)
        adj[j].add(i)

    dist = [float('inf')] * V
    from collections import deque as _deque
    queue = _deque()
    for c in [0, 17]:  # nose of P1 and P2
        dist[c] = 0
        queue.append(c)
    while queue:
        u = queue.popleft()
        for v in adj[u]:
            if dist[v] > dist[u] + 1:
                dist[v] = dist[u] + 1
                queue.append(v)

    # Partition: self, inward (toward center), outward (away from center)
    A_self = np.eye(V, dtype=np.float32)
    A_inward = np.zeros((V, V), dtype=np.float32)
    A_outward = np.zeros((V, V), dtype=np.float32)

    for i, j in edges:
        if dist[i] < dist[j]:
            A_inward[j][i] = 1
            A_outward[i][j] = 1
        elif dist[j] < dist[i]:
            A_inward[i][j] = 1
            A_outward[j][i] = 1
        else:
            A_inward[i][j] = 1
            A_inward[j][i] = 1

    # Normalize each partition: D^{-1/2} A D^{-1/2}
    def _normalize(A_part):
        D = np.sum(A_part, axis=1)
        D_safe = np.where(D > 0, D, 1)
        D_inv_sqrt = np.diag(np.where(D > 0, 1.0 / np.sqrt(D_safe), 0))
        return D_inv_sqrt @ A_part @ D_inv_sqrt

    return np.stack([_normalize(A_self), _normalize(A_inward), _normalize(A_outward)])


class SpatialGraphConv(nn.Module):
    """Graph convolution with spatial partitioning (3 sub-adjacency matrices)."""

    def __init__(self, in_channels, out_channels, A, num_partitions=3):
        super().__init__()
        self.num_partitions = num_partitions
        self.register_buffer('A', torch.tensor(A, dtype=torch.float32))
        self.conv = nn.Conv2d(in_channels, out_channels * num_partitions, kernel_size=1)
        self.bn = nn.BatchNorm2d(out_channels)

    def forward(self, x):
        B, C, T, V = x.shape
        x_conv = self.conv(x)  # (B, out_ch * K, T, V)
        C_out = x_conv.shape[1] // self.num_partitions
        x_conv = x_conv.reshape(B, self.num_partitions, C_out, T, V)

        out = torch.zeros(B, C_out, T, V, device=x.device)
        for k in range(self.num_partitions):
            out = out + torch.einsum('bctv,vw->bctw', x_conv[:, k], self.A[k])

        return self.bn(out)


class RelationPrediction(nn.Module):
    """
    RP module — learns adaptive inter-person interaction edges.
    B: globally-learned bias (which joints tend to interact)
    Attention: data-dependent (which joints interact in THIS sample)
    """

    def __init__(self, in_channels, num_nodes=34):
        super().__init__()
        self.B = nn.Parameter(torch.zeros(num_nodes, num_nodes))
        self.W_q = nn.Conv2d(in_channels, max(in_channels // 4, 1), kernel_size=1)
        self.W_k = nn.Conv2d(in_channels, max(in_channels // 4, 1), kernel_size=1)

    def forward(self, x):
        B, C, T, V = x.shape
        x_pool = x.mean(dim=2, keepdim=True)         # (B, C, 1, V)
        q = self.W_q(x_pool).squeeze(2)               # (B, C//4, V)
        k = self.W_k(x_pool).squeeze(2)               # (B, C//4, V)
        d = q.shape[1]
        attention = torch.bmm(q.permute(0, 2, 1), k) / (d ** 0.5)  # (B, V, V)
        attention = F.softmax(attention, dim=-1)
        C_adaptive = attention + self.B.unsqueeze(0)   # (B, V, V)
        return torch.einsum('bctv,bvw->bctw', x, C_adaptive)


class STGCNBlock(nn.Module):
    """Spatial-Temporal Graph Convolution Block with Relation Prediction."""

    def __init__(self, in_ch, out_ch, A, stride=1, dropout=0.1):
        super().__init__()
        self.sgcn = SpatialGraphConv(in_ch, out_ch, A)
        self.rp = RelationPrediction(in_ch, num_nodes=A.shape[1])
        self.rp_proj = nn.Conv2d(in_ch, out_ch, kernel_size=1) if in_ch != out_ch else nn.Identity()
        self.relu1 = nn.ReLU(inplace=True)
        self.tcn = nn.Sequential(
            nn.Conv2d(out_ch, out_ch, kernel_size=(9, 1), stride=(stride, 1), padding=(4, 0)),
            nn.BatchNorm2d(out_ch),
        )
        self.relu2 = nn.ReLU(inplace=True)
        self.drop = nn.Dropout(dropout)

        if in_ch != out_ch or stride != 1:
            self.residual = nn.Sequential(
                nn.Conv2d(in_ch, out_ch, kernel_size=1, stride=(stride, 1)),
                nn.BatchNorm2d(out_ch),
            )
        else:
            self.residual = nn.Identity()

    def forward(self, x):
        res = self.residual(x)
        # Spatial: GCN partitions + RP
        out = self.sgcn(x) + self.rp_proj(self.rp(x))
        out = self.relu1(out)
        # Temporal
        out = self.tcn(out)
        out = self.relu2(out + res)
        return self.drop(out)


class HPI_GCN_RP(nn.Module):
    """
    HPI-GCN-RP: Human Pose Interaction Graph Convolutional Network
    with Relation Prediction for violence detection.

    Input:  (batch, seq_len=30, features=102) — same as ViolenceLSTM
    Output: (batch,) — logits for BCEWithLogitsLoss / sigmoid
    """

    MODEL_NAME = "HPI-GCN-RP"

    def __init__(self, num_keypoints=17, num_people=2, in_channels=3,
                 num_classes=1, dropout=0.3):
        super().__init__()
        self.num_nodes = num_keypoints * num_people  # 34
        self.num_keypoints = num_keypoints
        self.num_people = num_people
        self.in_channels = in_channels

        A = build_coco_adjacency(num_keypoints, num_people)  # (3, 34, 34)

        self.bn_input = nn.BatchNorm1d(in_channels * self.num_nodes)

        self.layers = nn.ModuleList([
            STGCNBlock(3,   64,  A, stride=1, dropout=0.1),
            STGCNBlock(64,  64,  A, stride=1, dropout=0.1),
            STGCNBlock(64,  128, A, stride=2, dropout=0.1),
            STGCNBlock(128, 128, A, stride=1, dropout=0.1),
            STGCNBlock(128, 256, A, stride=2, dropout=0.1),
            STGCNBlock(256, 256, A, stride=1, dropout=0.1),
        ])

        self.drop = nn.Dropout(dropout)
        self.fc = nn.Linear(256, num_classes)

    def forward(self, x):
        # x: (B, T=30, F=102)
        B = x.size(0)
        T = x.size(1)

        # Reshape to graph: (B, C=3, T, V=34)
        x = x.reshape(B, T, self.num_people, self.num_keypoints, self.in_channels)
        x = x.reshape(B, T, self.num_nodes, self.in_channels)
        x = x.permute(0, 3, 1, 2)  # (B, C, T, V)

        # Input normalization
        x = x.reshape(B, self.in_channels * self.num_nodes, T)
        x = self.bn_input(x)
        x = x.reshape(B, self.in_channels, T, self.num_nodes)

        # ST-GCN blocks
        for layer in self.layers:
            x = layer(x)

        # Global average pooling over time and nodes
        x = x.mean(dim=[2, 3])  # (B, 256)
        x = self.drop(x)
        x = self.fc(x)          # (B, num_classes)
        return x.squeeze(-1)    # (B,)


# ── Skeleton Buffer ───────────────────────────────

class SkeletonBuffer:
    """Collects normalized skeleton frames for the classifier."""

    SEQUENCE_LEN = 30
    MAX_PEOPLE = 2
    NUM_KEYPOINTS = 17

    def __init__(self):
        self.buffer = deque(maxlen=self.SEQUENCE_LEN)

    def add_frame(self, poses: list, frame_shape: tuple):
        """
        Add one frame of pose data.

        Args:
            poses: list of keypoint arrays, each (17, 3) with (x, y, conf)
                   in pixel coordinates
            frame_shape: (height, width, ...) of the frame
        """
        h, w = frame_shape[:2]
        frame_features = []

        for kp in poses[:self.MAX_PEOPLE]:
            normalized = kp.copy()
            normalized[:, 0] /= w
            normalized[:, 1] /= h
            frame_features.append(normalized.flatten())

        # Pad if fewer than MAX_PEOPLE
        while len(frame_features) < self.MAX_PEOPLE:
            frame_features.append(np.zeros(self.NUM_KEYPOINTS * 3))

        # Sort people left-to-right (must match training extraction)
        if len(frame_features) >= 2:
            kp0 = frame_features[0].reshape(self.NUM_KEYPOINTS, 3)
            kp1 = frame_features[1].reshape(self.NUM_KEYPOINTS, 3)
            v0 = kp0[kp0[:, 2] > 0.3]
            v1 = kp1[kp1[:, 2] > 0.3]
            c0 = np.mean(v0[:, 0]) if len(v0) > 0 else 0.5
            c1 = np.mean(v1[:, 0]) if len(v1) > 0 else 0.5
            if c0 > c1:
                frame_features[0], frame_features[1] = frame_features[1], frame_features[0]

        self.buffer.append(np.concatenate(frame_features))

    @property
    def is_ready(self) -> bool:
        return len(self.buffer) == self.SEQUENCE_LEN

    def get_sequence(self) -> np.ndarray:
        """Returns (SEQUENCE_LEN, features) array."""
        if not self.is_ready:
            return None
        return np.array(list(self.buffer), dtype=np.float32)

    def clear(self):
        self.buffer.clear()


# ── Classifier Wrapper ────────────────────────────

class SkeletonClassifier:
    """
    Wraps the trained model for inference.
    Supports both ViolenceLSTM (legacy) and HPI-GCN-RP.

    Usage:
        clf = SkeletonClassifier("models/best_model.pth")

        # In detection loop:
        clf.buffer.add_frame(poses, frame.shape)
        if clf.buffer.is_ready:
            score = clf.predict()  # 0.0-1.0
    """

    # Left/right keypoint swap pairs (COCO 17-joint format)
    _LR_SWAP = [(1, 2), (3, 4), (5, 6), (7, 8), (9, 10), (11, 12), (13, 14), (15, 16)]

    def __init__(self, model_path: str = "models/best_model.pth", device: str = None):
        self.model_path = model_path
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.buffer = SkeletonBuffer()
        self.available = False
        self._last_score = 0.0
        self._model_type = "none"
        self._ema_score = 0.0
        self._ema_alpha = 0.3
        self._temperature = 1.0
        self._optimal_threshold = 0.5

        self._load_model()

    def _load_model(self):
        if not os.path.exists(self.model_path):
            print(f"[Classifier] No model at {self.model_path} — rule-based mode active")
            return

        try:
            state = torch.load(self.model_path, map_location=self.device, weights_only=True)

            # Auto-detect model type from checkpoint
            if "model_state_dict" in state:
                model_name = state.get('model_name', 'LSTM')
                model_state = state['model_state_dict']
            else:
                model_name = 'LSTM'
                model_state = state

            if model_name == 'HPI-GCN-RP':
                self.model = HPI_GCN_RP(
                    num_keypoints=state.get('num_keypoints', 17),
                    num_people=state.get('num_people', 2),
                    in_channels=state.get('in_channels', 3),
                )
            else:
                self.model = ViolenceLSTM()

            self.model.load_state_dict(model_state)
            self.model.to(self.device)
            self.model.eval()
            self.available = True
            self._model_type = model_name
            self._temperature = state.get('temperature', 1.0)
            self._optimal_threshold = state.get('optimal_threshold', 0.5)
            print(f"[Classifier] {self._model_type} model loaded from {self.model_path}")
            print(f"[Classifier] Device: {self.device}, T={self._temperature:.2f}, thr={self._optimal_threshold:.3f}")
        except Exception as e:
            print(f"[Classifier] Failed to load model: {e}")
            self.model = None

    @torch.no_grad()
    def predict(self, sequence: np.ndarray = None) -> float:
        """
        Predict violence score from skeleton sequence.
        Uses TTA (horizontal flip) and EMA smoothing.

        Args:
            sequence: (30, 102) array, or None to use internal buffer

        Returns:
            float: smoothed violence probability 0.0-1.0
        """
        if not self.available or self.model is None:
            return 0.0

        if sequence is None:
            if not self.buffer.is_ready:
                return 0.0
            sequence = self.buffer.get_sequence()

        # Original inference
        x = torch.FloatTensor(sequence).unsqueeze(0).to(self.device)
        logit_orig = self.model(x)

        # TTA: horizontally flipped inference
        seq_flip = sequence.copy().reshape(
            SkeletonBuffer.SEQUENCE_LEN, SkeletonBuffer.MAX_PEOPLE,
            SkeletonBuffer.NUM_KEYPOINTS, 3
        )
        seq_flip[:, :, :, 0] = np.where(
            seq_flip[:, :, :, 2] > 0,  # only flip keypoints with confidence > 0
            1.0 - seq_flip[:, :, :, 0],
            0.0
        )
        for l, r in self._LR_SWAP:
            seq_flip[:, :, [l, r], :] = seq_flip[:, :, [r, l], :]  # swap L/R joints
        seq_flip[:, [0, 1], :, :] = seq_flip[:, [1, 0], :, :]  # swap persons
        seq_flip = seq_flip.reshape(SkeletonBuffer.SEQUENCE_LEN, -1)

        x_flip = torch.FloatTensor(seq_flip).unsqueeze(0).to(self.device)
        logit_flip = self.model(x_flip)

        # Average logits, apply temperature scaling, sigmoid
        avg_logit = (logit_orig + logit_flip) / 2.0
        score = torch.sigmoid(avg_logit / self._temperature).item()

        # EMA smoothing
        self._ema_score = self._ema_alpha * score + (1 - self._ema_alpha) * self._ema_score
        self._last_score = self._ema_score
        return self._ema_score

    def reset_ema(self):
        """Reset EMA state (call when scene changes or people leave)."""
        self._ema_score = 0.0

    @property
    def optimal_threshold(self) -> float:
        """Optimal classification threshold from Youden's J (saved in checkpoint)."""
        return self._optimal_threshold

    @property
    def last_score(self) -> float:
        return self._last_score
