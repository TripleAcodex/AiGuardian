"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

interface GridPoint {
  originX: number;
  originY: number;
  x: number;
  y: number;
}

export default function KineticGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Skip on mobile / touch devices
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;

    // Skip if user prefers reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Add class to hide static CSS grid
    document.body.classList.add("kinetic-grid-active");

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const CELL_SIZE = 80;
    const INFLUENCE_RADIUS = 200;
    const MAX_DISPLACEMENT = 15;

    let points: GridPoint[] = [];
    let cols = 0;
    let rows = 0;

    const smoothMouse = { x: -1000, y: -1000 };

    function buildGrid() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      points = [];
      cols = Math.ceil(window.innerWidth / CELL_SIZE) + 1;
      rows = Math.ceil(window.innerHeight / CELL_SIZE) + 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          points.push({
            originX: c * CELL_SIZE,
            originY: r * CELL_SIZE,
            x: c * CELL_SIZE,
            y: r * CELL_SIZE,
          });
        }
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Smooth mouse tracking
      smoothMouse.x += (mouseRef.current.x - smoothMouse.x) * 0.08;
      smoothMouse.y += (mouseRef.current.y - smoothMouse.y) * 0.08;

      for (const p of points) {
        const dx = smoothMouse.x - p.originX;
        const dy = smoothMouse.y - p.originY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < INFLUENCE_RADIUS) {
          const force = (1 - dist / INFLUENCE_RADIUS) * MAX_DISPLACEMENT;
          const angle = Math.atan2(dy, dx);
          p.x = p.originX - Math.cos(angle) * force;
          p.y = p.originY - Math.sin(angle) * force;
        } else {
          p.x += (p.originX - p.x) * 0.1;
          p.y += (p.originY - p.y) * 0.1;
        }
      }

      // Draw grid lines
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const p = points[idx];

          // Proximity-based color
          const dx = smoothMouse.x - p.x;
          const dy = smoothMouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const proximity = Math.max(0, 1 - dist / (INFLUENCE_RADIUS * 1.5));

          const r255 = Math.floor(255 * proximity);
          const baseAlpha = 0.04;
          const alpha = baseAlpha + proximity * 0.06;

          ctx.strokeStyle = `rgba(${255 - (255 - r255) * 0.5}, ${Math.floor(255 * (1 - proximity) * 0.3)}, ${Math.floor(51 * proximity)}, ${alpha})`;
          ctx.lineWidth = 1;

          // Horizontal
          if (c < cols - 1) {
            const right = points[idx + 1];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(right.x, right.y);
            ctx.stroke();
          }
          // Vertical
          if (r < rows - 1) {
            const below = points[idx + cols];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(below.x, below.y);
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const onResize = () => {
      buildGrid();
    };

    buildGrid();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", onResize);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      document.body.classList.remove("kinetic-grid-active");
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 999 }}
      aria-hidden="true"
    />
  );
}
