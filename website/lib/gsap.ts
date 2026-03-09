"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function shouldAnimate(): boolean {
  if (typeof window === "undefined") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function createScrollReveal(
  element: gsap.TweenTarget,
  options: {
    trigger?: Element | null;
    from?: gsap.TweenVars;
    start?: string;
    duration?: number;
  } = {}
) {
  const {
    trigger,
    from = { opacity: 0, y: 40 },
    start = "top 85%",
    duration = 0.6,
  } = options;

  if (!shouldAnimate()) return;

  return gsap.from(element, {
    ...from,
    duration,
    ease: "power2.out",
    scrollTrigger: {
      trigger: (trigger as Element) || (element as Element),
      start,
      once: true,
    },
  });
}

export function createStaggerReveal(
  elements: gsap.TweenTarget,
  options: {
    trigger?: Element | null;
    from?: gsap.TweenVars;
    stagger?: number;
    start?: string;
    duration?: number;
  } = {}
) {
  const {
    trigger,
    from = { opacity: 0, y: 30 },
    stagger = 0.08,
    start = "top 85%",
    duration = 0.5,
  } = options;

  if (!shouldAnimate()) return;

  return gsap.from(elements, {
    ...from,
    duration,
    stagger,
    ease: "power2.out",
    scrollTrigger: {
      trigger: (trigger as Element) || undefined,
      start,
      once: true,
    },
  });
}

export { gsap, ScrollTrigger };
