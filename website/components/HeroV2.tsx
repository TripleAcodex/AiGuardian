"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { splitTextIntoWords } from "@/lib/useSplitText";
import dynamic from "next/dynamic";

// SPLINE_URL must be a .splinecode export URL from Spline's "Export → For Web" panel
const SPLINE_URL =
  process.env.NEXT_PUBLIC_SPLINE_URL ??
  "https://prod.spline.design/vuFwvIa1UTYFgwkX/scene.splinecode";

// Lazy-load Spline (client only)
const SplineComponent = dynamic(
  () => import("@splinetool/react-spline").then((m) => m.default),
  { ssr: false }
);

/** Canvas-based orb fallback -- shown while Spline loads or if URL is missing */
function OrbFallback() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.28;

      // Outer glow rings
      for (let ring = 3; ring >= 1; ring--) {
        const pulse = 1 + Math.sin(t * 0.018 + ring) * 0.04;
        const grad = ctx.createRadialGradient(cx, cy, r * 0.6 * pulse, cx, cy, r * (1 + ring * 0.35) * pulse);
        const a = (0.08 / ring).toFixed(2);
        grad.addColorStop(0, `rgba(220, 60, 60, ${a})`);
        grad.addColorStop(1, "rgba(220,60,60,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * (1 + ring * 0.35) * pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core sphere
      const sphereGrad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.05, cx, cy, r);
      sphereGrad.addColorStop(0, "rgba(230, 90, 80, 0.6)");
      sphereGrad.addColorStop(0.4, "rgba(200, 50, 50, 0.35)");
      sphereGrad.addColorStop(1, "rgba(100, 20, 20, 0.1)");
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting particles
      const particleCount = 80;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + t * 0.008 * (i % 3 === 0 ? 1 : -0.7);
        const orbitR = r * (0.85 + Math.sin(i * 2.4 + t * 0.012) * 0.3);
        const px = cx + Math.cos(angle) * orbitR;
        const py = cy + Math.sin(angle) * orbitR * 0.45;
        const alpha = (0.3 + Math.sin(i + t * 0.02) * 0.2).toFixed(2);
        const size = 1 + Math.sin(i * 1.7 + t * 0.015) * 0.8;
        ctx.fillStyle = `rgba(210, 70, 60, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, size * (devicePixelRatio > 1 ? 1.5 : 1), 0, Math.PI * 2);
        ctx.fill();
      }

      // Inner highlight
      const hilite = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx - r * 0.3, cy - r * 0.3, r * 0.5);
      hilite.addColorStop(0, "rgba(255,255,255,0.12)");
      hilite.addColorStop(1, "transparent");
      ctx.fillStyle = hilite;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      t++;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ opacity: 0.85 }}
    />
  );
}

/** Spline scene with loading/error handling */
function SplineOrb() {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Safety timeout: if Spline hasn't loaded in 10s, show fallback
    const timer = setTimeout(() => {
      setFailed((prev) => {
        if (!prev && !loaded) return true;
        return prev;
      });
    }, 10000);
    return () => clearTimeout(timer);
  }, [loaded]);

  if (failed || !SPLINE_URL) {
    return <OrbFallback />;
  }

  return (
    <div className="w-full h-full relative">
      {/* Show canvas orb while Spline loads */}
      {!loaded && (
        <div className="absolute inset-0 z-0">
          <OrbFallback />
        </div>
      )}
      <div className={`w-full h-full ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-700`}>
        <SplineComponent
          scene={SPLINE_URL}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollLineRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (headlineRef.current) {
        const words = splitTextIntoWords(headlineRef.current);
        gsap.to(words, {
          y: 0,
          duration: 0.8,
          stagger: 0.06,
          ease: "power3.out",
          delay: 0.3,
        });
      }

      const tl = gsap.timeline({ delay: 0.1 });

      tl.from(eyebrowRef.current, {
        opacity: 0, x: -20, duration: 0.7, ease: "power2.out",
      })
        .from(subRef.current, { opacity: 0, y: 30, duration: 0.8, ease: "power2.out" }, 0.9)
        .from(ctaRef.current, { opacity: 0, y: 20, duration: 0.7, ease: "power2.out" }, 1.1)
        .from(orbRef.current, { opacity: 0, scale: 0.88, duration: 1.4, ease: "power3.out" }, 0.4)
        .from(scrollRef.current, { opacity: 0, duration: 0.6, ease: "power2.out" }, 1.8);

      if (scrollLineRef.current) {
        gsap.fromTo(
          scrollLineRef.current,
          { scaleY: 0 },
          { scaleY: 1, duration: 2, repeat: -1, yoyo: true, ease: "power1.inOut" }
        );
      }
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center overflow-hidden bg-canvas"
    >
      {/* Perspective grid floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none opacity-[0.03] z-[1]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          transform: "perspective(500px) rotateX(60deg)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)",
        }}
      />

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-canvas via-canvas/60 to-transparent z-[2] pointer-events-none" />

      {/* Content: split layout */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-8 lg:px-16 pt-32 pb-32">
        <div className="grid lg:grid-cols-[1fr_0.85fr] gap-12 lg:gap-8 items-center">

          {/* Left: text */}
          <div className="flex flex-col">
            {/* Eyebrow */}
            <div
              ref={eyebrowRef}
              className="flex items-center gap-3 mb-8 px-4 py-2 rounded-full border border-danger/20 bg-danger/5 backdrop-blur-md w-fit"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-danger" />
              </span>
              <span className="text-[10px] text-danger font-medium tracking-[0.2em] uppercase font-[var(--font-heading)]">
                AI-Powered Threat Detection
              </span>
            </div>

            {/* Headline */}
            <h1
              ref={headlineRef}
              className="font-[var(--font-heading)] font-semibold text-primary/80 leading-[1.05] tracking-tighter mb-8 text-glow"
              style={{ fontSize: "clamp(3.5rem, 7vw, 6.5rem)", letterSpacing: "-0.04em" }}
            >
              People die because{" "}
              <span className="text-white text-gradient-light">
                help arrives too late.
              </span>
            </h1>

            {/* Sub */}
            <p
              ref={subRef}
              className="text-[17px] text-dim leading-[1.7] mb-14 max-w-[560px] font-[var(--font-body)]"
            >
              AI Guardian uses two-stage AI: skeleton detection + graph neural network.{" "}
              <span className="text-white font-medium">Violence confirmed in under one second.</span>
              <span className="text-muted block mt-3 text-base">
                No facial recognition. No stored footage. Just protection.
              </span>
            </p>

            {/* CTAs */}
            <div ref={ctaRef} className="flex flex-wrap items-center gap-4">
              <a
                href="#demo"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-canvas font-semibold text-[13px] tracking-wide rounded-md transition-all duration-300 hover:bg-neutral-200 hover:scale-[1.02] shadow-[0_0_40px_rgba(255,255,255,0.1)]"
              >
                Try Live Demo
              </a>
              <a
                href="/dashboard"
                className="btn-premium inline-flex items-center gap-3 px-7 py-3.5 text-dim text-[13px] font-medium tracking-wide hover:text-primary transition-all duration-300 rounded-md"
              >
                Enter Dashboard
              </a>
            </div>
          </div>

          {/* Right: Orb (Spline if URL set, canvas fallback otherwise) */}
          <div
            ref={orbRef}
            className="flex items-center justify-center lg:justify-end h-[500px] lg:h-[600px]"
          >
            <SplineOrb />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4"
      >
        <span className="text-sm text-dim uppercase tracking-[0.3em] font-[var(--font-mono)]">
          Scroll
        </span>
        <div ref={scrollLineRef} className="w-px h-16 bg-danger/40 origin-top" />
      </div>
    </section>
  );
}
