"use client";

import { useEffect, useRef, useId } from "react";
import { gsap } from "@/lib/gsap";

interface LiquidGlassProps {
  intensity?: number;
  speed?: number;
  className?: string;
}

export default function LiquidGlass({
  intensity = 8,
  speed = 4,
  className = "",
}: LiquidGlassProps) {
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const reactId = useId();
  // useId() generates ":r0:" style IDs -- safe for SSR/client consistency
  const filterId = "liquid-glass-" + reactId.replace(/:/g, "");

  useEffect(() => {
    const turbEl = turbulenceRef.current;
    if (!turbEl) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const obj = { freq: 0.015 };
    const tween = gsap.to(obj, {
      freq: 0.025,
      duration: speed,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      onUpdate: () => {
        turbEl.setAttribute("baseFrequency", `${obj.freq} ${obj.freq}`);
      },
    });

    return () => {
      tween.kill();
    };
  }, [speed]);

  return (
    <>
      <svg
        style={{ position: "absolute", width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter
            id={filterId}
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
          >
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0.015 0.015"
              numOctaves={3}
              seed={2}
              result="turbulence"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="turbulence"
              scale={intensity}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <div
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{ filter: `url(#${filterId})` }}
      />
    </>
  );
}

export function LiquidGlassPanel({
  children,
  className = "",
  intensity = 6,
  speed = 4,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  speed?: number;
}) {
  return (
    <div className={`relative ${className}`}>
      <LiquidGlass intensity={intensity} speed={speed} />
      <div className="liquid-glass relative z-10 rounded-2xl">{children}</div>
    </div>
  );
}
