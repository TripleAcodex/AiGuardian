"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { Monitor, AlertTriangle, Play, X, Radio, Eye } from "lucide-react";
import LiquidGlass from "@/components/LiquidGlass";

interface DemoStats {
  is_violence: boolean;
  confidence: number;
  person_count?: number;
  people_count?: number;
  fps: number;
  total_incidents: number;
  lstm_available?: boolean;
  threshold?: number;
}

/**
 * Simulated demo data when backend is offline
 * Shows a pre-baked sequence of skeleton detection frames
 */
const DEMO_SEQUENCE = [
  { time: 0, people: 2, violence: false, confidence: 0.1, fps: 28 },
  { time: 2, people: 3, violence: false, confidence: 0.15, fps: 30 },
  { time: 4, people: 3, violence: false, confidence: 0.2, fps: 29 },
  { time: 6, people: 3, violence: true, confidence: 0.78, fps: 27 },
  { time: 8, people: 3, violence: true, confidence: 0.92, fps: 26 },
  { time: 10, people: 2, violence: false, confidence: 0.12, fps: 30 },
  { time: 12, people: 1, violence: false, confidence: 0.05, fps: 31 },
];

export default function DemoSectionV2() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const monitorRef = useRef<HTMLDivElement>(null);

  const [demoActive, setDemoActive] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const [simFrame, setSimFrame] = useState(0);
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Check backend
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/backend/api/stats", { signal: AbortSignal.timeout(2000) });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setStats(data);
          setBackendOnline(true);
        }
      } catch {
        if (!cancelled) setBackendOnline(false);
      }
    };
    poll();
    const id = setInterval(poll, demoActive ? 1500 : 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [demoActive]);

  // Simulation mode timer
  useEffect(() => {
    if (!simulationMode) return;
    const interval = setInterval(() => {
      setSimFrame((prev) => (prev + 1) % DEMO_SEQUENCE.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [simulationMode]);

  const startDemo = useCallback(() => {
    if (backendOnline) {
      setDemoActive(true);
    } else {
      setSimulationMode(true);
      setDemoActive(true);
    }
  }, [backendOnline]);

  const stopDemo = useCallback(() => {
    setDemoActive(false);
    setSimulationMode(false);
    setSimFrame(0);
  }, []);

  useGSAP(
    () => {
      if (scanLineRef.current) {
        gsap.fromTo(scanLineRef.current, { y: "-10%" }, { y: "110%", duration: 3, repeat: -1, ease: "none" });
      }
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          opacity: 0, y: 40, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: headerRef.current, start: "top 85%", once: true },
        });
      }
      if (monitorRef.current) {
        gsap.from(monitorRef.current, {
          opacity: 0, scale: 0.92, y: 40, duration: 0.9, delay: 0.2, ease: "power3.out",
          scrollTrigger: { trigger: monitorRef.current, start: "top 85%", once: true },
        });
      }
    },
    { scope: containerRef }
  );

  const simData = DEMO_SEQUENCE[simFrame];
  const people = simulationMode ? simData.people : (stats?.person_count ?? stats?.people_count ?? 0);
  const isViolence = simulationMode ? simData.violence : (stats?.is_violence ?? false);
  const confidence = simulationMode ? simData.confidence : (stats?.confidence ?? 0);
  const fps = simulationMode ? simData.fps : (stats?.fps ?? 0);

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="relative section-padding bg-canvas overflow-hidden"
    >
      <div ref={containerRef}>
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-danger/[0.03] rounded-full blur-[200px]" />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-8">
          {/* Header */}
          <div ref={headerRef} className="mb-20 text-center max-w-2xl mx-auto">
            <span className="text-sm text-danger font-semibold tracking-[0.25em] uppercase block mb-5">
              INTERACTIVE DEMO
            </span>
            <h2
              className="inky font-[var(--font-heading)] font-bold text-primary tracking-[-0.04em] leading-[1.0] mb-6"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
            >
              Try it yourself.
            </h2>
            <p className="text-dim text-lg leading-relaxed">
              No sign-up required. Click play to see real-time AI violence detection
              {!backendOnline && " — running in simulation mode"}.
            </p>
          </div>

          {/* Monitor */}
          <div ref={monitorRef} className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-16 bg-danger/[0.04] rounded-full blur-[120px] pointer-events-none" />

            <div className="relative rounded-2xl overflow-hidden monitor-float">
              <LiquidGlass intensity={4} speed={5} />

              {/* Top bezel */}
              <div className="bg-surface/80 backdrop-blur-xl border border-border border-b-0 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className={`w-2.5 h-2.5 rounded-full transition-colors ${demoActive ? (isViolence ? "bg-danger animate-pulse shadow-[0_0_10px_rgba(255,60,60,0.8)]" : "bg-safe shadow-[0_0_10px_rgba(0,255,100,0.5)]") : backendOnline ? "bg-safe/50" : "bg-dim"}`} />
                  <Monitor className="w-3.5 h-3.5 text-danger/60" />
                  <span className="text-[11px] text-dim font-mono tracking-[0.15em] uppercase">
                    {demoActive ? (isViolence ? "\u26A0 Alert" : simulationMode ? "Simulation" : "Live") : "Standby"}
                  </span>
                  {simulationMode && demoActive && (
                    <span className="text-[10px] px-2 py-0.5 bg-danger/10 border border-danger/20 rounded-full text-danger font-mono">
                      SIM
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {demoActive && (
                    <span className="text-[11px] text-dim font-mono tabular-nums">
                      {fps} FPS
                    </span>
                  )}
                  {demoActive && (
                    <button
                      onClick={stopDemo}
                      className="text-dim hover:text-danger transition-colors p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full border border-muted/40" />
                    <div className="w-2 h-2 rounded-full border border-muted/40" />
                    <div className={`w-2 h-2 rounded-full ${demoActive ? "bg-danger shadow-[0_0_6px_rgba(255,60,60,0.6)]" : "bg-danger/40"}`} />
                  </div>
                </div>
              </div>

              {/* Screen */}
              <div
                className={`relative aspect-video bg-canvas border-x border-border overflow-hidden transition-all duration-500 ${
                  isViolence && demoActive ? "shadow-[inset_0_0_80px_oklch(65%_0.15_25_/_0.15)]" : ""
                }`}
              >
                {demoActive && !simulationMode ? (
                  /* ── LIVE CAMERA FEED ── */
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/backend/video_feed"
                      alt="Live AI Detection Feed"
                      className="w-full h-full object-cover"
                    />
                    <HUDOverlay
                      isViolence={isViolence}
                      confidence={confidence}
                      people={people}
                      fps={fps}
                      model={stats?.lstm_available ? "YOLO + HPI-GCN" : "YOLO11n-Pose"}
                    />
                  </>
                ) : demoActive && simulationMode ? (
                  /* ── SIMULATION MODE ── */
                  <>
                    <SimulationCanvas people={people} isViolence={isViolence} />
                    <HUDOverlay
                      isViolence={isViolence}
                      confidence={confidence}
                      people={people}
                      fps={fps}
                      model="YOLO11n-Pose (SIM)"
                    />
                  </>
                ) : (
                  /* ── STATIC STANDBY ── */
                  <StandbyScreen
                    backendOnline={backendOnline}
                    onStart={startDemo}
                  />
                )}

                {/* Scan line */}
                <div
                  ref={scanLineRef}
                  className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-danger/30 to-transparent pointer-events-none z-10"
                />

                {/* Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
              </div>

              {/* Bottom bezel */}
              <div className="bg-surface/80 backdrop-blur-xl border border-border border-t-0 px-6 py-4 flex items-center justify-between rounded-b-2xl">
                <div className="flex items-center gap-6">
                  <span className={`text-[11px] font-mono tracking-[0.15em] uppercase flex items-center gap-2 ${
                    demoActive ? (isViolence ? "text-danger" : "text-safe") : "text-dim"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      demoActive ? (isViolence ? "bg-danger animate-pulse" : "bg-safe") : backendOnline ? "bg-safe/50" : "bg-dim"
                    }`} />
                    {demoActive ? (isViolence ? "Alert" : "Monitoring") : backendOnline ? "Ready" : "Offline"}
                  </span>
                  {demoActive && (
                    <span className="text-[11px] text-dim font-mono tabular-nums">
                      {people} person{people !== 1 ? "s" : ""} &bull; {fps} FPS &bull; {(confidence * 100).toFixed(0)}% conf
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted/60 font-mono">
                  {simulationMode ? "Simulation Mode" : stats?.lstm_available ? "YOLO + HPI-GCN" : "YOLO11n-Pose"}
                </span>
              </div>
            </div>

            {/* Reflection */}
            <div className="h-12 bg-gradient-to-b from-danger/[0.03] to-transparent blur-sm mt-2 mx-12 pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── HUD Overlay ── */
function HUDOverlay({ isViolence, confidence, people, fps, model }: {
  isViolence: boolean;
  confidence: number;
  people: number;
  fps: number;
  model: string;
}) {
  return (
    <>
      {/* Top-left: status */}
      <div className="absolute top-4 left-4 flex items-center gap-3 z-10 pointer-events-none">
        <Radio className={`w-3.5 h-3.5 ${isViolence ? "text-danger animate-pulse" : "text-safe"}`} />
        <span className={`text-[11px] font-mono tracking-[0.1em] uppercase ${isViolence ? "text-danger" : "text-safe"}`}>
          {isViolence ? "\u26A0 Violence Detected" : "Monitoring"}
        </span>
      </div>

      {/* Top-right: model */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
        <span className="text-[10px] text-dim/50 font-mono">{model}</span>
      </div>

      {/* Bottom-left: people */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none flex items-center gap-2">
        <Eye className="w-3 h-3 text-dim/50" />
        <span className={`text-[11px] font-mono tabular-nums ${people > 3 ? "text-danger" : "text-dim/60"}`}>
          {people} {people === 1 ? "person" : "people"}
        </span>
      </div>

      {/* Bottom-right: confidence */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <span className={`text-[11px] font-mono tabular-nums ${isViolence ? "text-danger" : "text-dim/50"}`}>
          {(confidence * 100).toFixed(0)}% conf &bull; {fps} FPS
        </span>
      </div>

      {/* Alert banner */}
      {isViolence && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center gap-3 bg-danger/10 border border-danger/30 px-6 py-3 backdrop-blur-md rounded-xl shadow-[0_0_30px_rgba(255,60,60,0.2)]">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <span className="text-[11px] text-danger font-mono tracking-[0.1em] uppercase tabular-nums font-bold">
              Threat — {(confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Standby Screen ── */
function StandbyScreen({ backendOnline, onStart }: { backendOnline: boolean; onStart: () => void }) {
  return (
    <>
      {/* Surveillance grid */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(oklch(65% 0.15 25 / 0.3) 1px, transparent 1px), linear-gradient(90deg, oklch(65% 0.15 25 / 0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Standby content */}

      {/* Center: play button */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
        <button
          onClick={onStart}
          className="group relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 hover:scale-105"
        >
          {/* Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-danger/20 group-hover:border-danger/40 transition-colors" />
          <div className="absolute inset-2 rounded-full border border-danger/10 group-hover:border-danger/25 transition-colors" />
          <div className="absolute inset-0 rounded-full bg-danger/5 group-hover:bg-danger/10 transition-colors" />
          <div className="absolute inset-0 rounded-full shadow-[0_0_40px_oklch(65%_0.15_25_/_0.15)] group-hover:shadow-[0_0_60px_oklch(65%_0.15_25_/_0.25)] transition-shadow" />
          <Play className="w-8 h-8 text-danger ml-1 group-hover:scale-110 transition-transform relative z-10" />
        </button>
        <div className="text-center">
          <p className="text-sm text-dim font-mono tracking-[0.15em] uppercase mb-2">
            {backendOnline ? "Start Live Demo" : "Start Simulation"}
          </p>
          {!backendOnline && (
            <p className="text-[10px] text-muted font-mono">
              Backend offline — running simulated detection
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Simulation Canvas — animated skeleton wireframes ── */
function SimulationCanvas({ people, isViolence }: { people: number; isViolence: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Store reference for use in draw function
    const c = ctx;
    let time = 0;

    // Skeleton keypoint definitions (COCO format simplified)
    // [nose, leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist, leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle]
    const connections = [
      [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6],
      [1, 7], [2, 8], [7, 8], [7, 9], [8, 10], [9, 11], [10, 12],
    ];

    function generatePerson(cx: number, cy: number, scale: number, phase: number) {
      const t = time + phase;
      const sway = Math.sin(t * 2) * 5 * scale;
      const armSwing = Math.sin(t * 3) * 15 * scale;

      return [
        [cx + sway, cy - 80 * scale],            // nose
        [cx - 20 * scale + sway, cy - 55 * scale], // leftShoulder
        [cx + 20 * scale + sway, cy - 55 * scale], // rightShoulder
        [cx - 35 * scale + armSwing, cy - 30 * scale], // leftElbow
        [cx + 35 * scale - armSwing, cy - 30 * scale], // rightElbow
        [cx - 40 * scale + armSwing * 1.3, cy - 5 * scale], // leftWrist
        [cx + 40 * scale - armSwing * 1.3, cy - 5 * scale], // rightWrist
        [cx - 15 * scale, cy + 5 * scale],         // leftHip
        [cx + 15 * scale, cy + 5 * scale],         // rightHip
        [cx - 18 * scale, cy + 40 * scale],        // leftKnee
        [cx + 18 * scale, cy + 40 * scale],        // rightKnee
        [cx - 20 * scale, cy + 75 * scale],        // leftAnkle
        [cx + 20 * scale, cy + 75 * scale],        // rightAnkle
      ];
    }

    function draw() {
      time += 0.02;
      c.clearRect(0, 0, W, H);

      // Dark background
      c.fillStyle = "rgba(10, 10, 15, 0.95)";
      c.fillRect(0, 0, W, H);

      // Grid
      c.strokeStyle = "rgba(255, 60, 60, 0.03)";
      c.lineWidth = 0.5;
      for (let x = 0; x < W; x += 30) {
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
      }
      for (let y = 0; y < H; y += 30) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
      }

      // Generate skeletons
      const positions = [];
      const spacing = W / (people + 1);
      for (let i = 0; i < people; i++) {
        positions.push(generatePerson(spacing * (i + 1), H * 0.55, 1.2, i * 1.5));
      }

      // Draw skeletons
      const color = isViolence ? "rgba(255, 60, 60," : "rgba(0, 200, 100,";

      for (const skeleton of positions) {
        // Draw bones
        for (const [a, b] of connections) {
          const [ax, ay] = skeleton[a];
          const [bx, by] = skeleton[b];
          c.beginPath();
          c.moveTo(ax, ay);
          c.lineTo(bx, by);
          c.strokeStyle = `${color} 0.7)`;
          c.lineWidth = 2;
          c.stroke();
        }

        // Draw joints
        for (const [jx, jy] of skeleton) {
          c.beginPath();
          c.arc(jx, jy, 4, 0, Math.PI * 2);
          c.fillStyle = `${color} 0.9)`;
          c.fill();

          // Glow
          if (isViolence) {
            const grad = c.createRadialGradient(jx, jy, 0, jx, jy, 10);
            grad.addColorStop(0, "rgba(255, 60, 60, 0.3)");
            grad.addColorStop(1, "transparent");
            c.fillStyle = grad;
            c.beginPath();
            c.arc(jx, jy, 10, 0, Math.PI * 2);
            c.fill();
          }
        }

        // Bounding box
        const xs = skeleton.map((p: number[]) => p[0]);
        const ys = skeleton.map((p: number[]) => p[1]);
        const minX = Math.min(...xs) - 20;
        const maxX = Math.max(...xs) + 20;
        const minY = Math.min(...ys) - 20;
        const maxY = Math.max(...ys) + 20;

        c.strokeStyle = `${color} 0.3)`;
        c.lineWidth = 1;
        c.setLineDash([4, 4]);
        c.strokeRect(minX, minY, maxX - minX, maxY - minY);
        c.setLineDash([]);

        // Label
        c.fillStyle = `${color} 0.6)`;
        c.font = "10px monospace";
        c.fillText(isViolence ? "THREAT" : "PERSON", minX, minY - 5);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [people, isViolence]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  );
}
