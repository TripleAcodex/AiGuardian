"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { Monitor, AlertTriangle, Play, X } from "lucide-react";
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

export default function DemoSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const monitorRef = useRef<HTMLDivElement>(null);

  const [demoActive, setDemoActive] = useState(false);
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Check if backend is online + poll stats
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

  const startDemo = useCallback(() => {
    setDemoActive(true);
  }, []);

  const stopDemo = useCallback(() => {
    setDemoActive(false);
  }, []);

  useGSAP(
    () => {
      if (scanLineRef.current) {
        gsap.fromTo(
          scanLineRef.current,
          { y: "-10%" },
          { y: "110%", duration: 3, repeat: -1, ease: "none" }
        );
      }
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          opacity: 0, x: -40, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: headerRef.current, start: "top 85%", once: true },
        });
      }
      if (monitorRef.current) {
        gsap.from(monitorRef.current, {
          opacity: 0, scale: 0.95, y: 30, duration: 0.8, delay: 0.15, ease: "power2.out",
          scrollTrigger: { trigger: monitorRef.current, start: "top 85%", once: true },
        });
      }
    },
    { scope: containerRef }
  );

  const people = stats?.person_count ?? stats?.people_count ?? 0;
  const isViolence = stats?.is_violence ?? false;
  const confidence = stats?.confidence ?? 0;
  const fps = stats?.fps ?? 0;

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="relative section-padding bg-canvas overflow-hidden"
    >
      <div ref={containerRef}>
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=1920&q=80"
            alt=""
            className="w-full h-full object-cover grayscale opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/85 to-canvas/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-canvas" />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-8">
          {/* Header */}
          <div ref={headerRef} className="mb-20">
            <span className="text-sm text-danger font-medium tracking-[0.2em] uppercase block mb-4">
              INTERACTIVE DEMO
            </span>
            <h2
              className="inky font-[var(--font-heading)] font-semibold text-primary tracking-[-0.03em] leading-[1.0] mb-6"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
            >
              Try it yourself.
            </h2>
            <p className="text-dim text-base leading-relaxed max-w-lg">
              No sign-up required. Click play to see real-time AI violence detection
              running on your camera.
            </p>
          </div>

          {/* Monitor */}
          <div ref={monitorRef} className="relative max-w-4xl">
            <div className="absolute -inset-12 bg-danger/[0.03] rounded-full blur-[100px] pointer-events-none" />

            <div className="relative rounded-2xl overflow-hidden monitor-float">
              <LiquidGlass intensity={4} speed={5} />

              {/* Top bezel */}
              <div className="bg-surface border border-border border-b-0 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${demoActive ? (isViolence ? "bg-danger animate-pulse" : "bg-safe") : backendOnline ? "bg-safe/50" : "bg-dim"}`} />
                  <Monitor className="w-3 h-3 text-danger/60" />
                  <span className="text-sm text-dim font-mono tracking-widest uppercase">
                    {demoActive ? (isViolence ? "\u26A0 Alert" : "Live") : "Standby"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {demoActive && (
                    <span className="text-sm text-dim font-mono tabular-nums">
                      {fps} FPS
                    </span>
                  )}
                  {demoActive && (
                    <button
                      onClick={stopDemo}
                      className="text-dim hover:text-danger transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full border border-muted" />
                    <div className="w-2 h-2 rounded-full border border-muted" />
                    <div className={`w-2 h-2 rounded-full ${demoActive ? "bg-danger" : "bg-danger/50"}`} />
                  </div>
                </div>
              </div>

              {/* Screen */}
              <div
                className={`relative aspect-video bg-canvas border-x border-border overflow-hidden transition-all duration-500 ${
                  isViolence && demoActive ? "shadow-[inset_0_0_60px_oklch(65%_0.15_25_/_0.1)]" : ""
                }`}
              >
                {demoActive ? (
                  /* ── LIVE CAMERA FEED ── */
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/backend/video_feed"
                      alt="Live AI Detection Feed"
                      className="w-full h-full object-cover"
                    />

                    {/* Top-left: status */}
                    <div className="absolute top-4 left-4 flex items-center gap-4 z-10 pointer-events-none">
                      <div className={`w-2 h-2 rounded-full ${isViolence ? "bg-danger animate-pulse" : "bg-safe"}`} />
                      <span className={`text-sm font-mono tracking-wider uppercase ${isViolence ? "text-danger" : "text-safe"}`}>
                        {isViolence ? "\u26A0 Violence Detected" : "Monitoring"}
                      </span>
                    </div>

                    {/* Top-right: model */}
                    <div className="absolute top-4 right-4 z-10 pointer-events-none">
                      <span className="text-sm text-dim/70 font-mono">
                        YOLO11n-Pose {stats?.lstm_available ? "+ HPI-GCN" : ""}
                      </span>
                    </div>

                    {/* Bottom-left: people */}
                    <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                      <span className={`text-sm font-mono tabular-nums ${people > 3 ? "text-danger" : "text-dim/70"}`}>
                        {people} {people === 1 ? "person" : "people"}
                      </span>
                    </div>

                    {/* Bottom-right: confidence */}
                    <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
                      {isViolence ? (
                        <span className="text-sm text-danger font-mono tabular-nums">
                          {(confidence * 100).toFixed(0)}% confidence
                        </span>
                      ) : (
                        <span className="text-sm text-dim/70 font-mono tabular-nums">
                          {fps} FPS
                        </span>
                      )}
                    </div>

                    {/* Alert banner */}
                    {isViolence && (
                      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                        <div className="flex items-center gap-4 bg-danger/10 border border-danger/30 px-6 py-4 backdrop-blur-sm rounded-2xl">
                          <AlertTriangle className="w-4 h-4 text-danger" />
                          <span className="text-sm text-danger font-mono tracking-wider uppercase tabular-nums">
                            Threat — {(confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* ── STATIC STANDBY ── */
                  <>
                    {/* Surveillance grid */}
                    <div className="absolute inset-0 opacity-[0.04]">
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundImage:
                            "linear-gradient(oklch(65% 0.15 25 / 0.3) 1px, transparent 1px), linear-gradient(90deg, oklch(65% 0.15 25 / 0.3) 1px, transparent 1px)",
                          backgroundSize: "40px 40px",
                        }}
                      />
                    </div>

                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-danger/20" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-danger/20" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-danger/20" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-danger/20" />

                    {/* Center: play button */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                      <button
                        onClick={startDemo}
                        disabled={!backendOnline}
                        className="group w-20 h-20 border-2 border-danger/30 flex items-center justify-center hover:bg-danger/10 hover:border-danger hover:shadow-[0_0_40px_oklch(65%_0.15_25_/_0.2)] transition-all duration-500 disabled:opacity-20 disabled:cursor-not-allowed rounded-full"
                      >
                        <Play className="w-8 h-8 text-danger ml-1 group-hover:scale-110 transition-transform" />
                      </button>
                      <p className="text-sm text-dim font-mono tracking-wider uppercase">
                        {backendOnline ? "Try Live Demo" : "Backend offline"}
                      </p>
                      {!backendOnline && (
                        <code className="text-sm text-muted font-mono bg-surface/50 px-4 py-1 rounded">
                          python main.py
                        </code>
                      )}
                    </div>
                  </>
                )}

                {/* Scan line */}
                <div
                  ref={scanLineRef}
                  className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-danger/30 to-transparent pointer-events-none z-10"
                />

                {/* Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />
              </div>

              {/* Bottom bezel */}
              <div className="bg-surface border border-border border-t-0 px-6 py-4 flex items-center justify-between rounded-b-2xl">
                <div className="flex items-center gap-6">
                  <span className={`text-sm font-mono tracking-wider uppercase flex items-center gap-1.5 ${
                    demoActive ? (isViolence ? "text-danger" : "text-safe") : "text-dim"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      demoActive ? (isViolence ? "bg-danger animate-pulse" : "bg-safe") : backendOnline ? "bg-safe/50" : "bg-dim"
                    }`} />
                    {demoActive ? (isViolence ? "Alert" : "Monitoring") : backendOnline ? "Ready" : "Offline"}
                  </span>
                  {demoActive && (
                    <span className="text-sm text-dim font-mono tabular-nums">
                      {people} person{people !== 1 ? "s" : ""} &bull; {fps} FPS
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted font-mono">
                  {demoActive && stats?.lstm_available ? "YOLO + HPI-GCN" : "YOLO11n-Pose"}
                </span>
              </div>
            </div>

            {/* Reflection */}
            <div className="h-8 bg-gradient-to-b from-danger/[0.02] to-transparent blur-sm mt-1 mx-8 pointer-events-none" />
          </div>

          {/* CTA below monitor */}
          {demoActive && (
            <div className="mt-8 max-w-4xl">
              <a
                href="/dashboard"
                className="shimmer-btn inline-flex items-center gap-4 px-8 py-4 bg-danger text-white text-sm font-semibold tracking-wide uppercase hover:bg-danger/90 transition-all rounded-2xl"
              >
                Enter Dashboard
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
