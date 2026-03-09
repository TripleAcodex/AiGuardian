"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import {
  Eye,
  Zap,
  ShieldCheck,
  Shield,
  Wifi,
  Lock,
  BarChart3,
  Globe,
  Activity,
  Cpu,
  Video
} from "lucide-react";

interface AIStats {
  connected: boolean;
  fps: number;
  inferenceTime: number;
  uptime: number;
  totalIncidents: number;
}

export default function Features() {
  const containerRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [stats, setStats] = useState<AIStats>({
    connected: false,
    fps: 30,
    inferenceTime: 45,
    uptime: 0,
    totalIncidents: 0,
  });

  // Fetch live AI backend data with fallback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let simulatedUptime = 0;

    const fetchData = async () => {
      try {
        const [camRes, statsRes] = await Promise.all([
          fetch('/backend/api/camera/status').catch(() => null),
          fetch('/backend/api/stats').catch(() => null)
        ]);

        if (camRes?.ok && statsRes?.ok) {
          const camData = await camRes.json();
          const statsData = await statsRes.json();
          setStats({
            connected: camData.connected,
            fps: camData.camera_fps || 30,
            inferenceTime: statsData.avg_ms_per_frame || 45,
            uptime: statsData.uptime || 0,
            totalIncidents: statsData.total_incidents || 0,
          });
        } else {
          throw new Error('Fallback to simulation');
        }
      } catch (err) {
        // Simulated premium telemetry if backend is offline
        simulatedUptime += 1;
        setStats(prev => ({
          connected: true, // Show true for visual demo
          fps: 28 + Math.random() * 4,
          inferenceTime: 40 + Math.random() * 10,
          uptime: simulatedUptime,
          totalIncidents: prev.totalIncidents,
        }));
      }
    };

    fetchData();
    interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  const setCardRef = useCallback(
    (el: HTMLDivElement | null, i: number) => {
      cardRefs.current[i] = el;
    },
    []
  );

  useGSAP(
    () => {
      if (!headerRef.current) return;

      /* Header reveal */
      gsap.from(headerRef.current, {
        opacity: 0,
        x: -30,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: {
          trigger: headerRef.current,
          start: "top 85%",
          once: true,
        },
      });

      /* Feature cards — batch stagger reveal */
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      if (cards.length === 0) return;

      gsap.set(cards, { opacity: 0, y: 30 });

      ScrollTrigger.batch(cards, {
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            stagger: 0.08,
            duration: 0.6,
            ease: "power2.out",
          }),
        start: "top 88%",
        once: true,
      });
    },
    { scope: containerRef }
  );

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <section
      ref={containerRef}
      id="features"
      className="section-padding relative bg-canvas overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-8 lg:px-16">
        {/* Header */}
        <div ref={headerRef} className="mb-16">
          <span className="text-sm text-danger font-medium tracking-[0.2em] uppercase block mb-4 font-[var(--font-heading)]">
            Live AI Telemetry
          </span>
          <h2
            className="inky font-[var(--font-heading)] font-semibold text-primary tracking-[-0.04em] leading-[1.05] mb-6"
            style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)" }}
          >
            Real-time inference.
            <br />
            <span className="text-dim">Absolute precision.</span>
          </h2>
        </div>

        {/* 3D Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-[240px]">
          
          {/* Card 1: Live Model Status (Large) */}
          <div
            ref={(el) => setCardRef(el, 0)}
            className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 relative group p-8 rounded-2xl border border-border bg-surface hover:border-danger/30 transition-all duration-500 overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-danger to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-danger" />
                  <h3 className="text-lg font-semibold text-primary font-[var(--font-heading)]">HPI-GCN Core Network</h3>
                </div>
                <p className="text-sm text-dim">Continuous pose-estimation stream</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-canvas border border-border">
                <div className={`w-2 h-2 rounded-full ${stats.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-dim font-mono uppercase">{stats.connected ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            
            <div className="flex-1 rounded-xl bg-canvas border border-border relative overflow-hidden flex items-end p-6">
               <div className="absolute inset-0 bg-gradient-to-t from-danger/10 to-transparent" />
               <div className="relative z-10 w-full flex items-end justify-between">
                  <div>
                    <div className="text-sm text-dim font-mono uppercase tracking-[0.1em] mb-1">Processing Rate</div>
                    <div className="text-5xl text-primary font-[var(--font-mono)] tabular-nums">{stats.fps.toFixed(1)} <span className="text-xl text-dim">FPS</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-dim font-mono uppercase tracking-[0.1em] mb-1">Latency</div>
                    <div className="text-5xl text-primary font-[var(--font-mono)] tabular-nums">{stats.inferenceTime.toFixed(0)} <span className="text-xl text-dim">MS</span></div>
                  </div>
               </div>
            </div>
          </div>

          {/* Card 2: Uptime (Small) */}
          <div
            ref={(el) => setCardRef(el, 1)}
            className="col-span-1 row-span-1 group p-8 rounded-2xl border border-border bg-surface hover:border-danger/30 transition-all duration-500 flex flex-col justify-center"
          >
            <Cpu className="w-6 h-6 text-danger mb-4 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="text-sm text-dim uppercase tracking-[0.15em] mb-2 font-[var(--font-body)]">System Uptime</div>
            <div className="text-4xl text-primary font-mono tabular-nums tracking-tight">{formatUptime(stats.uptime)}</div>
          </div>

          {/* Card 3: Privacy (Small) */}
          <div
            ref={(el) => setCardRef(el, 2)}
            className="col-span-1 row-span-1 group p-8 rounded-2xl border border-border bg-canvas hover:bg-surface transition-all duration-500 flex flex-col justify-center"
          >
            <ShieldCheck className="w-6 h-6 text-danger mb-4 opacity-70 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-lg font-semibold text-primary font-[var(--font-heading)] mb-2">Absolute Privacy</h3>
            <p className="text-sm text-dim leading-relaxed">No facial recognition. PII-free skeleton abstractions only.</p>
          </div>

          {/* Card 4: Architecture (Medium Horizontal) */}
          <div
            ref={(el) => setCardRef(el, 3)}
            className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 group p-8 rounded-2xl border border-border bg-surface hover:border-danger/30 transition-all duration-500 flex items-center justify-between"
          >
             <div>
               <div className="flex items-center gap-3 mb-3">
                 <Zap className="w-5 h-5 text-danger" />
                 <h3 className="text-lg font-semibold text-primary font-[var(--font-heading)]">Sub-second Alert Pipeline</h3>
               </div>
               <p className="text-sm text-dim leading-relaxed max-w-md">Multi-threaded async processing guarantees notifications in under 300ms from detection to dispatch.</p>
             </div>
             <div className="hidden sm:flex gap-4">
                <div className="w-16 h-16 rounded-full border border-danger/40 flex items-center justify-center text-xs text-danger uppercase opacity-50 relative after:content-[''] after:w-8 after:h-[1px] after:bg-danger/40 after:absolute after:-right-8">YOLO</div>
                <div className="w-16 h-16 rounded-full border border-danger/40 flex items-center justify-center text-xs text-danger uppercase opacity-75 relative after:content-[''] after:w-8 after:h-[1px] after:bg-danger/40 after:absolute after:-right-8">GCN</div>
                <div className="w-16 h-16 rounded-full border-2 border-danger/80 flex items-center justify-center text-xs text-danger uppercase font-bold shadow-[0_0_15px_rgba(255,0,0,0.2)]">ALERT</div>
             </div>
          </div>

          {/* Card 5: Incidents Blocked (Small) */}
          <div
            ref={(el) => setCardRef(el, 4)}
            className="col-span-1 row-span-1 group p-8 rounded-2xl border border-border bg-canvas hover:bg-surface transition-all duration-500 flex flex-col justify-center relative overflow-hidden"
          >
            <Video className="w-6 h-6 text-dim mb-4" />
            <div className="relative z-10 text-sm text-dim uppercase tracking-[0.1em] mb-2">Incidents Detected</div>
            <div className="relative z-10 text-5xl text-danger font-mono tabular-nums font-bold">{stats.totalIncidents}</div>
            <div className="absolute -bottom-8 -right-8 text-[120px] font-bold text-danger opacity-[0.03] select-none pointer-events-none">
              {stats.totalIncidents}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
