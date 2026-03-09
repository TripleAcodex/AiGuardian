"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

export default function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;

    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible || !outerRef.current || !dotRef.current) return;

    const outer = outerRef.current;
    const dot = dotRef.current;

    const xTo = gsap.quickTo(outer, "x", { duration: 0.4, ease: "power3.out" });
    const yTo = gsap.quickTo(outer, "y", { duration: 0.4, ease: "power3.out" });
    const dotXTo = gsap.quickTo(dot, "x", { duration: 0.15, ease: "power3.out" });
    const dotYTo = gsap.quickTo(dot, "y", { duration: 0.15, ease: "power3.out" });

    const move = (e: MouseEvent) => {
      xTo(e.clientX - 20);
      yTo(e.clientY - 20);
      dotXTo(e.clientX - 3);
      dotYTo(e.clientY - 3);
    };

    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("a, button, [data-cursor-hover]")) {
        gsap.to(outer, { scale: 1.6, duration: 0.3, ease: "power2.out" });
      }
    };

    const out = () => {
      gsap.to(outer, { scale: 1, duration: 0.3, ease: "power2.out" });
    };

    window.addEventListener("mousemove", move);
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);

    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", out);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <div
        ref={outerRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 40,
          height: 40,
          border: "1.5px solid oklch(65% 0.15 25)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9999,
          mixBlendMode: "difference",
          transform: "translate(-100px, -100px)",
        }}
      />
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 6,
          height: 6,
          backgroundColor: "oklch(65% 0.15 25)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9999,
          transform: "translate(-100px, -100px)",
        }}
      />
    </>
  );
}
