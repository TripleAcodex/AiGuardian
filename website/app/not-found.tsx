"use client";

import { useRef, useEffect, useCallback } from "react";
import { gsap, shouldAnimate } from "@/lib/gsap";
import Link from "next/link";

/* ── Particle type ── */
interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

/* ── Sample "404" text pixels from an offscreen canvas ── */
function sampleTextParticles(
  width: number,
  height: number,
  targetCount: number
): { x: number; y: number }[] {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return [];

  const fontSize = Math.min(width * 0.28, height * 0.7);
  ctx.fillStyle = "#fff";
  ctx.font = `900 ${fontSize}px "Clash Display", "Arial Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("404", width / 2, height / 2);

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const points: { x: number; y: number }[] = [];

  const step = Math.max(2, Math.floor(Math.sqrt((width * height) / (targetCount * 4))));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      if (pixels[idx + 3] > 128) {
        points.push({ x, y });
      }
    }
  }

  /* Trim or pad to approximate target count */
  if (points.length > targetCount) {
    const shuffled = points.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, targetCount);
  }

  return points;
}

export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const animateEnabled = useRef(true);

  /* ── Build particles from sampled text coordinates ── */
  const initParticles = useCallback((width: number, height: number) => {
    const points = sampleTextParticles(width, height, 300);
    particlesRef.current = points.map((p) => ({
      x: p.x + (Math.random() - 0.5) * width * 0.8,
      y: p.y + (Math.random() - 0.5) * height * 0.8,
      targetX: p.x,
      targetY: p.y,
      vx: 0,
      vy: 0,
      radius: 1.5 + Math.random() * 1.5,
      opacity: 0.6 + Math.random() * 0.4,
    }));
  }, []);

  /* ── Main animation loop ── */
  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const repelRadius = 120;
    const repelForce = 8;

    for (const p of particlesRef.current) {
      /* Distance to mouse */
      const dx = p.x - mx;
      const dy = p.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < repelRadius && dist > 0) {
        /* Repulsion */
        const force = (1 - dist / repelRadius) * repelForce;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      /* Spring back to target */
      const sx = p.targetX - p.x;
      const sy = p.targetY - p.y;
      p.vx += sx * 0.04;
      p.vy += sy * 0.04;

      /* Damping */
      p.vx *= 0.88;
      p.vy *= 0.88;

      p.x += p.vx;
      p.y += p.vy;

      /* Draw */
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 0, 51, ${p.opacity})`;
      ctx.shadowColor = "#FF0033";
      ctx.shadowBlur = 8;
      ctx.fill();
    }

    /* Reset shadow for next frame */
    ctx.shadowBlur = 0;

    rafRef.current = requestAnimationFrame(renderLoop);
  }, []);

  /* ── Draw static "404" for reduced-motion ── */
  const drawStatic = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const fontSize = Math.min(width * 0.28, height * 0.7);
    ctx.fillStyle = "#FF0033";
    ctx.font = `900 ${fontSize}px "Clash Display", "Arial Black", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#FF0033";
    ctx.shadowBlur = 30;
    ctx.fillText("404", width / 2, height / 2);
    ctx.shadowBlur = 0;
  }, []);

  /* ── Setup and resize handling ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    animateEnabled.current = shouldAnimate();

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);

      if (animateEnabled.current) {
        initParticles(rect.width, rect.height);
      } else {
        /* Reduced-motion: draw once, then use logical (CSS) sizes */
        const logicalCanvas = canvasRef.current;
        if (logicalCanvas) {
          const lctx = logicalCanvas.getContext("2d");
          if (lctx) {
            lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          }
        }
        drawStatic();
      }
    };

    resize();

    if (animateEnabled.current) {
      rafRef.current = requestAnimationFrame(renderLoop);
    }

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [initParticles, renderLoop, drawStatic]);

  /* ── Mouse tracking on canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleLeave = () => {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mouseleave", handleLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  /* ── GSAP entrance stagger on text elements ── */
  useEffect(() => {
    if (!shouldAnimate()) return;

    const targets = [headingRef.current, descRef.current, linkRef.current].filter(
      Boolean
    );

    gsap.set(targets, { opacity: 0, y: 30 });

    gsap.to(targets, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      stagger: 0.15,
      ease: "power2.out",
      delay: 0.4,
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col overflow-hidden">
      {/* ── Particle canvas area — top 60% ── */}
      <div ref={containerRef} className="relative w-full" style={{ height: "60vh" }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: "crosshair" }}
        />

        {/* Subtle radial glow behind the 404 */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, rgba(255,0,51,0.06) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* ── Text content area — bottom 40% ── */}
      <div
        ref={textRef}
        className="relative flex-1 flex flex-col items-center justify-center px-8 overflow-hidden"
      >
        {/* Scan line sweep effect */}
        <style>{`
          @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(calc(40vh)); }
          }
          .scanline-container::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 0, 51, 0.3) 20%,
              rgba(255, 0, 51, 0.6) 50%,
              rgba(255, 0, 51, 0.3) 80%,
              transparent 100%
            );
            box-shadow: 0 0 15px rgba(255, 0, 51, 0.3);
            animation: scanline 3s linear infinite;
            pointer-events: none;
            z-index: 1;
          }
          @media (prefers-reduced-motion: reduce) {
            .scanline-container::before {
              animation: none;
              display: none;
            }
          }
        `}</style>

        <div className="scanline-container absolute inset-0 pointer-events-none" />

        <h1
          ref={headingRef}
          className="text-2xl md:text-3xl uppercase tracking-[0.3em] text-[#E8E8E8] mb-4 text-center"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Signal Lost
        </h1>

        <p
          ref={descRef}
          className="text-sm md:text-base text-[#666] text-center max-w-md mb-10 leading-relaxed"
          style={{ fontFamily: "var(--font-body)" }}
        >
          The camera feed you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <Link
          ref={linkRef}
          href="/"
          className="inline-flex items-center gap-3 px-8 py-4 border border-[#3A3A3A] text-[#E8E8E8] text-sm tracking-[0.15em] uppercase transition-all duration-300 hover:border-[#FF0033]/50 hover:shadow-[0_0_30px_rgba(255,0,51,0.15)] hover:text-[#FF0033]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Return to base
        </Link>
      </div>
    </div>
  );
}
