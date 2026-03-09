"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import {
  Send, Trash2, Plus, X, Users, AlertTriangle, Upload, Film,
  Video, Activity, TrendingUp, TrendingDown, Minus,
  Maximize2, Shield, Zap, Clock, Eye
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useDetections } from "@/hooks/useDetections";
import { useCameraStream } from "@/hooks/useCameraStream";
import { useTelegram } from "@/hooks/useTelegram";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const DetectionChart = dynamic(() => import("@/components/DetectionChart"), {
  ssr: false,
  loading: () => <div className="h-64 bg-surface/50 animate-pulse rounded-xl" />,
});

/* -- Sparkline mini chart ----------------------------- */
function Sparkline({ data, color = "var(--color-danger)", height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return <div style={{ height }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const fillPoints = `0,${height} ${points} ${w},${height}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polyline points={fillPoints} fill={color} fillOpacity={0.08} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* -- Stat Card with sparkline ----------------------------- */
function StatCard({
  label, value, suffix, icon, color, sparkData, delta, href,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ReactNode;
  color: string;
  sparkData?: number[];
  delta?: number | null;
  href?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (cardRef.current) {
      gsap.from(cardRef.current, { opacity: 0, y: 15, duration: 0.4, ease: "power2.out" });
    }
  });

  const DeltaIcon = delta && delta > 0 ? TrendingUp : delta && delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta && delta > 0 ? "text-danger" : delta && delta < 0 ? "text-safe" : "text-muted";

  const inner = (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-xl border border-white/[0.06] bg-surface/40 backdrop-blur-sm p-4 transition-all duration-300 hover:bg-surface/60 hover:border-white/10 group ${href ? "cursor-pointer" : ""}`}
    >
      {/* Subtle glow on top */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />
      
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center`} style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {delta !== undefined && delta !== null && (
          <div className={`flex items-center gap-1 text-[10px] font-mono ${deltaColor}`}>
            <DeltaIcon className="w-3 h-3" />
            {Math.abs(delta)}%
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-2xl font-semibold text-primary font-mono tabular-nums tracking-tight">{value}</span>
        {suffix && <span className="text-xs text-muted uppercase tracking-wider">{suffix}</span>}
      </div>
      <div className="text-[11px] text-muted uppercase tracking-[0.15em]">{label}</div>

      {sparkData && sparkData.length > 1 && (
        <div className="mt-3 -mx-1">
          <Sparkline data={sparkData} color={color} height={28} />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

/* -- Activity Feed Item ----------------------------- */
function ActivityItem({ type, message, time, isNew }: {
  type: "alert" | "info" | "success";
  message: string;
  time: string;
  isNew?: boolean;
}) {
  const colors = {
    alert: "bg-danger",
    info: "bg-accent",
    success: "bg-safe",
  };
  return (
    <div className={`flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors ${isNew ? "bg-white/[0.02]" : "hover:bg-white/[0.02]"}`}>
      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${colors[type]} ${isNew ? "animate-pulse" : ""}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-dim leading-relaxed">{message}</p>
        <p className="text-[10px] text-muted font-mono mt-0.5">{time}</p>
      </div>
    </div>
  );
}

/* -- Add Camera Modal ----------------------------- */
function AddCameraModal({
  open,
  onClose,
  onConnect,
}: {
  open: boolean;
  onClose: () => void;
  onConnect: (source: string, uploadUrl?: string) => void;
}) {
  const [tab, setTab] = useState<"webcam" | "rtsp" | "file">("webcam");
  const [rtspUrl, setRtspUrl] = useState("");
  const [rtspUser, setRtspUser] = useState("");
  const [rtspPass, setRtspPass] = useState("");
  const [rtspIp, setRtspIp] = useState("");
  const [rtspPort, setRtspPort] = useState("554");
  const [fileUrl, setFileUrl] = useState("");
  const [uploadFileUrl, setUploadFileUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (open && backdropRef.current && modalRef.current) {
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      gsap.fromTo(modalRef.current, { opacity: 0, scale: 0.95, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.2, delay: 0.05 });
    }
  }, [open]);

  const handleConnect = async () => {
    setConnecting(true);
    let source: string;
    if (tab === "webcam") {
      source = "0";
    } else if (tab === "rtsp") {
      if (rtspUrl) {
        source = rtspUrl;
      } else {
        const auth = rtspUser ? `${rtspUser}:${rtspPass}@` : "";
        source = `rtsp://${auth}${rtspIp}:${rtspPort}/stream1`;
      }
    } else {
      source = fileUrl;
    }
    onConnect(source, tab === "file" ? uploadFileUrl : undefined);
    setTimeout(() => {
      setConnecting(false);
      onClose();
    }, 2000);
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setUploadProgress("Only video files allowed");
      return;
    }
    setUploading(true);
    setUploadProgress(`Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) {
        setFileUrl(data.path);
        if (data.upload_url) setUploadFileUrl(data.upload_url);
        setUploadProgress(`Uploaded! ${data.size_mb} MB`);
      } else {
        setUploadProgress("Upload failed");
      }
    } catch {
      setUploadProgress("Backend offline");
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-canvas border border-border rounded-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm text-primary font-medium">Add Camera</h2>
            <p className="text-sm text-dim mt-1">Select video source</p>
          </div>
          <button onClick={onClose} className="text-dim hover:text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["webcam", "rtsp", "file"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-4 text-sm uppercase tracking-[0.15em] transition-colors ${
                tab === t
                  ? "text-danger border-b border-danger"
                  : "text-dim hover:text-primary"
              }`}
            >
              {t === "webcam" ? "Webcam" : t === "rtsp" ? "IP Camera" : "Video File"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {tab === "webcam" && (
            <div className="space-y-4">
              <div className="p-4 border border-border bg-canvas rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-safe" />
                  <span className="text-sm text-primary">Built-in Webcam</span>
                </div>
                <p className="text-sm text-dim mt-1 font-mono">Device index: 0</p>
              </div>
            </div>
          )}

          {tab === "rtsp" && (
            <div className="space-y-4">
              <div className="p-4 border border-border bg-canvas rounded-2xl space-y-4">
                <p className="text-sm text-dim">
                  Enter full RTSP URL or fill in the fields below:
                </p>
                <input
                  type="text"
                  placeholder="rtsp://admin:password@192.168.1.100:554/stream1"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  className="w-full bg-canvas border border-border px-4 py-4 text-sm text-primary placeholder-muted font-mono focus:outline-none focus:border-danger/40 rounded-2xl"
                />
              </div>

              <div className="text-sm text-muted text-center uppercase tracking-[0.15em]">
                — or fill manually —
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-dim uppercase tracking-[0.1em]">IP Address</label>
                  <input
                    type="text"
                    placeholder="192.168.1.100"
                    value={rtspIp}
                    onChange={(e) => setRtspIp(e.target.value)}
                    className="w-full bg-canvas border border-border px-4 py-4 text-sm text-primary placeholder-muted font-mono focus:outline-none focus:border-danger/40 mt-1 rounded-2xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-dim uppercase tracking-[0.1em]">Port</label>
                  <input
                    type="text"
                    placeholder="554"
                    value={rtspPort}
                    onChange={(e) => setRtspPort(e.target.value)}
                    className="w-full bg-canvas border border-border px-4 py-4 text-sm text-primary placeholder-muted font-mono focus:outline-none focus:border-danger/40 mt-1 rounded-2xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-dim uppercase tracking-[0.1em]">Username</label>
                  <input
                    type="text"
                    placeholder="admin"
                    value={rtspUser}
                    onChange={(e) => setRtspUser(e.target.value)}
                    className="w-full bg-canvas border border-border px-4 py-4 text-sm text-primary placeholder-muted font-mono focus:outline-none focus:border-danger/40 mt-1 rounded-2xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-dim uppercase tracking-[0.1em]">Password</label>
                  <input
                    type="password"
                    placeholder="••••••"
                    value={rtspPass}
                    onChange={(e) => setRtspPass(e.target.value)}
                    className="w-full bg-canvas border border-border px-4 py-4 text-sm text-primary placeholder-muted font-mono focus:outline-none focus:border-danger/40 mt-1 rounded-2xl"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "file" && (
            <div className="space-y-4">
              {/* Drag-and-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed cursor-pointer transition-all text-center rounded-2xl ${
                  dragOver
                    ? "border-danger bg-danger/5"
                    : "border-border bg-canvas hover:border-elevated"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                {uploading ? (
                  <div className="space-y-4">
                    <div className="w-6 h-6 border border-danger animate-spin mx-auto" />
                    <p className="text-sm text-dim">{uploadProgress}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-6 h-6 text-dim mx-auto" />
                    <p className="text-sm text-dim">
                      Drop video here or <span className="text-danger">click to browse</span>
                    </p>
                    <p className="text-sm text-muted">MP4, AVI, MOV, MKV supported</p>
                  </div>
                )}
              </div>

              {/* Upload result or manual path */}
              {fileUrl && (
                <div className="flex items-center gap-4 p-4 border border-border bg-canvas rounded-2xl">
                  <Film className="w-4 h-4 text-safe shrink-0" />
                  <span className="text-sm text-dim font-mono truncate flex-1">{fileUrl}</span>
                </div>
              )}
              {uploadProgress && !uploading && (
                <p className="text-sm text-safe">{uploadProgress}</p>
              )}

              {/* Divider */}
              <div className="text-sm text-muted text-center uppercase tracking-[0.15em]">
                — or enter path manually —
              </div>

              {/* Manual path input */}
              <div className="p-4 border border-border bg-canvas rounded-2xl space-y-4">
                <p className="text-sm text-dim">Path to video file on server:</p>
                <input
                  type="text"
                  placeholder="C:\Videos\test.mp4 or http://..."
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full bg-canvas border border-border px-4 py-4 text-sm text-primary placeholder-muted font-mono focus:outline-none focus:border-danger/40 rounded-2xl"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm text-dim hover:text-primary uppercase tracking-[0.15em] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={connecting || (tab === "rtsp" && !rtspUrl && !rtspIp) || (tab === "file" && !fileUrl)}
            className="shimmer-btn px-6 py-4 bg-danger text-white text-sm uppercase tracking-[0.15em] hover:bg-danger/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-4 rounded-2xl"
          >
            {connecting ? (
              <>
                <div className="w-4 h-4 border border-white/50 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -- Live Camera Card (Enhanced) ----------------------------- */
function LiveCameraCard({
  stats,
  connected,
  cameraStatus,
  uploadUrl,
}: {
  stats: ReturnType<typeof useDetections>["stats"];
  connected: boolean;
  cameraStatus: ReturnType<typeof useCameraStream>["cameraStatus"];
  uploadUrl?: string | null;
}) {
  const isViolence = stats?.is_violence ?? false;
  const confidence = stats?.confidence ?? 0;
  const people = stats?.person_count ?? stats?.people_count ?? 0;
  const fps = stats?.fps ?? 0;
  const status = !connected ? "connecting" : isViolence ? "alert" : "active";
  const camLabel = cameraStatus?.type === "RTSP/IP" ? "IP CAM" : cameraStatus?.type === "Webcam" ? "WEBCAM" : "SOURCE";

  const cardRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);

  const handleFullscreen = () => {
    if (!cardRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      cardRef.current.requestFullscreen();
    }
  };

  useGSAP(() => {
    gsap.from(cardRef.current, { opacity: 0, y: 20, duration: 0.5, ease: "power2.out" });
  });

  useGSAP(() => {
    if (connected && scanRef.current) {
      gsap.fromTo(scanRef.current, { y: "-10%" }, { y: "200%", duration: 5, repeat: -1, ease: "none" });
    }
  }, [connected]);

  useGSAP(() => {
    if (isViolence && pulseRef.current) {
      gsap.to(pulseRef.current, { opacity: 0.1, duration: 0.6, repeat: -1, yoyo: true, ease: "power1.inOut" });
    }
  }, [isViolence]);

  useGSAP(() => {
    if (isViolence && badgeRef.current) {
      gsap.from(badgeRef.current, { opacity: 0, scale: 0.8, duration: 0.3 });
    }
  }, [isViolence]);

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-xl border transition-all duration-500 ${
        status === "alert"
          ? "border-danger/40 shadow-[0_0_60px_var(--color-danger-glow)]"
          : "border-white/[0.06] hover:border-white/10"
      }`}
    >
      {/* Alert glow bar at top */}
      {isViolence && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-danger to-transparent z-10 animate-pulse" />
      )}

      <div className="relative aspect-video bg-canvas overflow-hidden">
        {connected ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/video_feed`}
            alt="Live Camera Feed"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/30">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 rounded-full border-2 border-danger/30 border-t-danger animate-spin mx-auto" />
              <p className="text-xs text-dim uppercase tracking-[0.2em]">
                Connecting to feed...
              </p>
              <p className="text-[10px] text-muted font-mono">
                FastAPI backend on port 8000
              </p>
            </div>
          </div>
        )}

        {/* Scan line */}
        {connected && (
          <div
            ref={scanRef}
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-danger/30 to-transparent pointer-events-none"
          />
        )}

        {/* Top-left: status badge */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md backdrop-blur-sm ${
            status === "alert" ? "bg-danger/20 border border-danger/30" : 
            status === "active" ? "bg-safe/10 border border-safe/20" : 
            "bg-white/5 border border-white/10"
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              status === "alert" ? "bg-danger animate-pulse" : 
              status === "active" ? "bg-safe" : 
              "bg-dim animate-pulse"
            }`} />
            <span className={`text-[10px] font-mono tracking-wider uppercase ${
              status === "alert" ? "text-danger" : 
              status === "active" ? "text-safe" : 
              "text-dim"
            }`}>
              {status === "alert" ? "\u26A0 VIOLENCE" : status === "active" ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Top-right: resolution + type */}
        <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none">
          {cameraStatus && (
            <span className="text-[10px] text-dim/80 font-mono bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
              {cameraStatus.resolution}
            </span>
          )}
          <span className="text-[10px] text-danger/60 font-mono bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
            {camLabel}
          </span>
        </div>

        {/* Fullscreen button */}
        {connected && (
          <button
            onClick={handleFullscreen}
            className="absolute top-12 right-3 z-10 p-1.5 bg-black/40 backdrop-blur-sm hover:bg-black/60 border border-white/10 rounded-md text-dim hover:text-primary transition-all"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Bottom overlay with stats */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-10 pb-3 px-3 pointer-events-none">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-dim" />
                <span className="text-[10px] text-dim font-mono tabular-nums">
                  {connected ? `${fps} FPS` : "— FPS"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-dim" />
                <span className={`text-[10px] font-mono tabular-nums ${people > 3 ? "text-danger" : "text-dim"}`}>
                  {people} {people === 1 ? "person" : "people"}
                </span>
              </div>
            </div>
            {isViolence && (
              <div className="flex items-center gap-1.5 text-danger">
                <Shield className="w-3 h-3" />
                <span className="text-[10px] font-mono font-bold tabular-nums">
                  {(confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t border-l border-danger/15 pointer-events-none rounded-tl" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t border-r border-danger/15 pointer-events-none rounded-tr" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b border-l border-danger/15 pointer-events-none rounded-bl" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b border-r border-danger/15 pointer-events-none rounded-br" />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.4))] pointer-events-none" />

        {/* Alert pulse overlay */}
        {isViolence && (
          <div ref={pulseRef} className="absolute inset-0 bg-danger opacity-0 pointer-events-none" />
        )}
      </div>

      {/* Info bar */}
      <div className="px-4 py-3 bg-surface/40 border-t border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs text-primary font-medium">
              {cameraStatus?.type === "RTSP/IP" ? "IP Camera" : "Primary Camera"} — Live Feed
            </h3>
            <p className="text-[10px] text-muted mt-0.5 font-mono">
              YOLO11n-Pose &bull; {stats?.lstm_available ? "HPI-GCN Level 2" : "Rule-based L1"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isViolence && (
              <span
                ref={badgeRef}
                className="text-[10px] text-danger font-mono tracking-wider uppercase px-2.5 py-1 border border-danger/30 bg-danger/5 rounded-md animate-pulse"
              >
                {"\u26A0"} ALERT
              </span>
            )}
            <span
              className={`text-[10px] font-mono tracking-wider uppercase px-2.5 py-1 border rounded-md ${
                status === "alert"
                  ? "text-danger border-danger/30"
                  : status === "active"
                    ? "text-safe border-safe/20"
                    : "text-dim border-white/10"
              }`}
            >
              {status === "alert" ? "ALERT" : status === "active" ? "MONITORING" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- Dashboard Page (Command Center) ------------------------------- */
export default function DashboardPage() {
  const { stats, connected, history, refetch } = useDetections(2000);
  const { cameraStatus, connectCamera, refetchCamera } = useCameraStream(5000);
  const { testing: telegramTesting, result: telegramResult, testTelegram: handleTestTelegram } = useTelegram();

  const [showAddCamera, setShowAddCamera] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<Array<{type: "alert"|"info"|"success"; message: string; time: string; isNew?: boolean}>>([]);

  const prevViolenceRef = useRef(false);

  // Build sparkline data from history
  const confSpark = history.slice(-20).map(h => Math.round(h.confidence * 100));
  const peopleSpark = history.slice(-20).map(h => h.people);
  const fpsSpark = history.slice(-20).map(h => {
    // Estimate FPS from history entries - use stats.fps when available
    return stats?.fps ?? 0;
  });

  // Calculate deltas
  const nowConf = history.length > 0 ? Math.round(history[history.length - 1].confidence * 100) : 0;
  const prevConf = history.length > 5 ? Math.round(history[history.length - 6].confidence * 100) : nowConf;
  const confDelta = prevConf > 0 ? Math.round(((nowConf - prevConf) / (prevConf || 1)) * 100) : 0;

  // Track violence events for activity log
  useEffect(() => {
    const isViolence = stats?.is_violence ?? false;
    if (isViolence && !prevViolenceRef.current) {
      const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setActivityLog(prev => [{
        type: "alert" as const,
        message: `Violence detected — ${((stats?.confidence ?? 0) * 100).toFixed(0)}% confidence`,
        time: now,
        isNew: true,
      }, ...prev].slice(0, 20));
    }
    prevViolenceRef.current = isViolence;
  }, [stats?.is_violence, stats?.confidence]);

  // Log connection events
  useEffect(() => {
    if (connected) {
      const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setActivityLog(prev => {
        if (prev.length === 0 || prev[0].message !== "Backend connected") {
          return [{ type: "success" as const, message: "Backend connected", time: now }, ...prev].slice(0, 20);
        }
        return prev;
      });
    }
  }, [connected]);

  const handleConnectCamera = async (source: string, fileUploadUrl?: string) => {
    if (fileUploadUrl) setUploadUrl(fileUploadUrl);
    else setUploadUrl(null);
    await connectCamera(source);
    const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setActivityLog(prev => [{ type: "info" as const, message: `Camera connected: ${source === "0" ? "Webcam" : source}`, time: now }, ...prev].slice(0, 20));
    setTimeout(() => {
      refetch();
      refetchCamera();
    }, 2500);
  };

  const handleClearIncidents = async () => {
    try {
      await fetch("/backend/api/incidents/clear", { method: "POST" });
      refetch();
      const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setActivityLog(prev => [{ type: "info" as const, message: "Incidents cleared", time: now }, ...prev].slice(0, 20));
    } catch { /* backend offline */ }
  };

  const people = stats?.person_count ?? stats?.people_count ?? 0;
  const incidents = stats?.total_incidents ?? 0;

  return (
    <div className="space-y-5">
      {/* Stats Grid */}
      <ErrorBoundary fallbackLabel="Stats unavailable">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="System Status"
            value={connected ? "Online" : "Offline"}
            icon={<Zap className="w-3.5 h-3.5" />}
            color={connected ? "var(--color-safe)" : "var(--color-dim)"}
            suffix={connected ? `${stats?.fps ?? 0} fps` : undefined}
            sparkData={fpsSpark}
          />
          <StatCard
            label="Threat Level"
            value={stats?.is_violence ? `${(stats.confidence * 100).toFixed(0)}` : "0"}
            suffix="%"
            icon={<Shield className="w-3.5 h-3.5" />}
            color="var(--color-danger)"
            sparkData={confSpark}
            delta={confDelta !== 0 ? confDelta : null}
          />
          <StatCard
            label="People Detected"
            value={people}
            icon={<Eye className="w-3.5 h-3.5" />}
            color="var(--color-accent)"
            sparkData={peopleSpark}
          />
          <StatCard
            label="Total Incidents"
            value={incidents}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            color="var(--color-danger)"
            href="/dashboard/incidents"
          />
        </div>
      </ErrorBoundary>

      {/* Main content: Camera + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left column: Camera + Chart */}
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-xs text-muted uppercase tracking-[0.2em] font-medium">Live Feed</h3>
              {!connected && (
                <span className="text-[10px] text-danger/60 font-mono animate-pulse">
                  Backend offline
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestTelegram}
                disabled={telegramTesting || !connected}
                className="px-3 py-1.5 border border-white/[0.06] hover:border-white/10 text-[11px] text-dim hover:text-primary uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 rounded-lg bg-surface/30"
              >
                {telegramTesting ? (
                  <div className="w-3 h-3 border border-dim border-t-transparent animate-spin rounded-full" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                {telegramResult ?? "Test"}
              </button>
              <button
                onClick={handleClearIncidents}
                className="px-3 py-1.5 border border-white/[0.06] hover:border-white/10 text-[11px] text-dim hover:text-primary uppercase tracking-wider transition-all flex items-center gap-2 rounded-lg bg-surface/30"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
              <button
                onClick={() => setShowAddCamera(true)}
                className="px-4 py-1.5 bg-danger hover:bg-danger/90 text-white text-[11px] uppercase tracking-wider transition-all flex items-center gap-2 rounded-lg shadow-lg shadow-danger/20"
              >
                <Plus className="w-3 h-3" />
                Add Camera
              </button>
            </div>
          </div>

          {/* Camera Feed */}
          <ErrorBoundary fallbackLabel="Camera feed unavailable">
            <LiveCameraCard stats={stats} connected={connected} cameraStatus={cameraStatus} uploadUrl={uploadUrl} />
          </ErrorBoundary>

          {/* Detection Chart */}
          <ErrorBoundary fallbackLabel="Chart unavailable">
            <DetectionChart history={history} threshold={stats?.threshold} />
          </ErrorBoundary>

          {/* Camera Info Strip */}
          {cameraStatus && connected && (
            <ErrorBoundary fallbackLabel="Camera info unavailable">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { label: "Source", value: cameraStatus.type, icon: <Video className="w-3 h-3" /> },
                  { label: "Resolution", value: cameraStatus.resolution, icon: <Maximize2 className="w-3 h-3" /> },
                  { label: "Camera FPS", value: `${cameraStatus.camera_fps}`, icon: <Activity className="w-3 h-3" /> },
                  { label: "AI FPS", value: `${stats?.fps ?? 0}`, icon: <Zap className="w-3 h-3" /> },
                  { label: "Detection", value: stats?.lstm_available ? "GCN+Rules" : "Rule-based", icon: <Shield className="w-3 h-3" /> },
                ].map((item) => (
                  <div key={item.label} className="bg-surface/30 border border-white/[0.04] rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-muted">{item.icon}</span>
                      <span className="text-[10px] text-muted uppercase tracking-wider">{item.label}</span>
                    </div>
                    <div className="text-xs text-primary font-mono">{item.value}</div>
                  </div>
                ))}
              </div>
            </ErrorBoundary>
          )}
        </div>

        {/* Right column: Activity Feed */}
        <div className="hidden lg:block">
          <div className="sticky top-[72px] space-y-3">
            {/* Activity Feed */}
            <div className="rounded-xl border border-white/[0.06] bg-surface/30 backdrop-blur-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.04]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted" />
                    <span className="text-[11px] text-muted uppercase tracking-[0.15em] font-medium">Activity Feed</span>
                  </div>
                  <span className="text-[10px] text-muted font-mono">{activityLog.length} events</span>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {activityLog.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Activity className="w-5 h-5 text-muted mx-auto mb-2" />
                    <p className="text-[11px] text-muted">No activity yet</p>
                    <p className="text-[10px] text-muted/60 mt-1">Events will appear here in real-time</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {activityLog.map((item, i) => (
                      <ActivityItem key={`${item.time}-${i}`} {...item} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Card */}
            <div className="rounded-xl border border-white/[0.06] bg-surface/30 backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-muted" />
                <span className="text-[11px] text-muted uppercase tracking-[0.15em] font-medium">Quick Info</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Model", value: "YOLO11n-Pose", color: "text-primary" },
                  { label: "Classifier", value: stats?.lstm_available ? "HPI-GCN-RP" : "Rule-based", color: stats?.lstm_available ? "text-safe" : "text-dim" },
                  { label: "Threshold", value: `${((stats?.threshold ?? 0.5) * 100).toFixed(0)}%`, color: "text-primary" },
                  { label: "LSTM Score", value: stats?.lstm_score !== undefined ? `${(stats.lstm_score * 100).toFixed(0)}%` : "N/A", color: "text-dim" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[10px] text-muted uppercase tracking-wider">{item.label}</span>
                    <span className={`text-[11px] font-mono ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/dashboard/incidents"
                className="rounded-lg border border-white/[0.06] bg-surface/30 px-3 py-2.5 hover:bg-surface/50 hover:border-white/10 transition-all group"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-danger mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] text-dim uppercase tracking-wider block">View Incidents</span>
              </Link>
              <Link
                href="/dashboard/settings"
                className="rounded-lg border border-white/[0.06] bg-surface/30 px-3 py-2.5 hover:bg-surface/50 hover:border-white/10 transition-all group"
              >
                <Zap className="w-3.5 h-3.5 text-accent mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] text-dim uppercase tracking-wider block">Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Add Camera Modal */}
      <AddCameraModal
        open={showAddCamera}
        onClose={() => setShowAddCamera(false)}
        onConnect={handleConnectCamera}
      />
    </div>
  );
}
