"use client";

import { useRef, useEffect, useCallback } from "react";
import createGlobe from "cobe";

export default function GlobeVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  }, []);

  const onPointerUp = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const onPointerOut = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerInteracting.current !== null) {
      const delta = e.clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    let width = 0;
    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.12, 0.12, 0.14],
      markerColor: [0.85, 0.1, 0.1],
      glowColor: [0.25, 0.04, 0.04],
      markers: [
        // Kazakhstan (home)
        { location: [51.1694, 71.4491], size: 0.07 },   // Astana
        { location: [43.2380, 76.9454], size: 0.06 },   // Almaty
        // Major cities
        { location: [40.7128, -74.0060], size: 0.04 },  // New York
        { location: [51.5074, -0.1278], size: 0.04 },   // London
        { location: [35.6762, 139.6503], size: 0.04 },  // Tokyo
        { location: [48.8566, 2.3522], size: 0.03 },    // Paris
        { location: [55.7558, 37.6173], size: 0.03 },   // Moscow
        { location: [1.3521, 103.8198], size: 0.03 },   // Singapore
        { location: [-33.8688, 151.2093], size: 0.03 }, // Sydney
        { location: [25.2048, 55.2708], size: 0.03 },   // Dubai
        { location: [37.5665, 126.9780], size: 0.03 },  // Seoul
        { location: [39.9042, 116.4074], size: 0.03 },  // Beijing
      ],
      onRender: (state) => {
        if (pointerInteracting.current === null) {
          phiRef.current += 0.003;
        }
        state.phi = phiRef.current + pointerInteractionMovement.current / 200;
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    // Fade in
    setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = "1";
    }, 100);

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="relative w-full aspect-square max-w-[600px] mx-auto">
      {/* Glow behind globe */}
      <div className="absolute inset-0 bg-danger/[0.06] rounded-full blur-[80px] scale-75 pointer-events-none" />
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerOut={onPointerOut}
        onPointerMove={onPointerMove}
        className="w-full h-full cursor-grab opacity-0 transition-opacity duration-1000"
        style={{ contain: "layout paint size" }}
      />
    </div>
  );
}
