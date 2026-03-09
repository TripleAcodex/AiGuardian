"use client";

import { useRef, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { Camera, Brain, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  num: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}

const steps: Step[] = [
  {
    num: "01",
    icon: Camera,
    title: "Connect",
    desc: "Any RTSP camera, webcam, or video file. One command to start.",
  },
  {
    num: "02",
    icon: Brain,
    title: "Analyze",
    desc: "Stage 1: YOLOv11-Pose builds a skeleton of every person. Stage 2: HPI-GCN-RP graph network verifies the motion over 2 seconds.",
  },
  {
    num: "03",
    icon: Bell,
    title: "Alert",
    desc: "Telegram notification with a screenshot fires the instant violence is confirmed.",
  },
];

export default function HowItWorks() {
  const containerRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setStepRef = useCallback(
    (el: HTMLDivElement | null, i: number) => {
      stepRefs.current[i] = el;
    },
    []
  );

  const setLineRef = useCallback(
    (el: HTMLDivElement | null, i: number) => {
      lineRefs.current[i] = el;
    },
    []
  );

  useGSAP(
    () => {
      /* Header reveal */
      if (headerRef.current) {
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
      }

      /* Step reveals — staggered entrance */
      const stepsEls = stepRefs.current.filter(Boolean) as HTMLDivElement[];
      if (stepsEls.length > 0) {
        gsap.set(stepsEls, { opacity: 0, y: 40 });

        ScrollTrigger.create({
          trigger: stepsEls[0],
          start: "top 85%",
          once: true,
          onEnter: () => {
            gsap.to(stepsEls, {
              opacity: 1,
              y: 0,
              stagger: 0.15,
              duration: 0.7,
              ease: "power2.out",
            });
          },
        });
      }

      /* Connecting line draw animation */
      const lines = lineRefs.current.filter(Boolean) as HTMLDivElement[];
      if (lines.length > 0) {
        gsap.set(lines, { scaleX: 0, transformOrigin: "left center" });

        ScrollTrigger.create({
          trigger: stepsEls[0] || lines[0],
          start: "top 80%",
          once: true,
          onEnter: () => {
            gsap.to(lines, {
              scaleX: 1,
              stagger: 0.2,
              duration: 0.8,
              delay: 0.4,
              ease: "power2.inOut",
            });
          },
        });
      }
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      id="how-it-works"
      className="section-padding relative bg-canvas overflow-hidden"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-danger/20 via-danger/5 to-transparent" />

      <div className="max-w-[1400px] mx-auto px-8">
        {/* Section header — left-aligned */}
        <div ref={headerRef} className="mb-28">
          <span className="text-sm text-danger font-medium tracking-[0.2em] uppercase block mb-4 font-[var(--font-heading)]">
            How It Works
          </span>
          <h2
            className="inky font-[var(--font-heading)] font-semibold text-primary tracking-[-0.03em] leading-[1.05]"
            style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)" }}
          >
            Camera to alert.
            <br />
            <span className="text-dim">Under one second.</span>
          </h2>
        </div>

        {/* Steps — horizontal layout */}
        <div className="grid md:grid-cols-3 gap-0 relative">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="relative flex flex-col">
                {/* Step card */}
                <div
                  ref={(el) => setStepRef(el, i)}
                  className="group relative flex-1 px-8 py-10 md:py-0"
                >
                  {/* Large dim number behind */}
                  <div
                    className="absolute top-0 left-4 md:left-6 text-[8rem] md:text-[10rem] font-semibold font-[var(--font-heading)] text-[#0F0F0F] leading-none select-none pointer-events-none group-hover:text-danger/[0.06] transition-colors duration-700"
                    aria-hidden="true"
                  >
                    {step.num}
                  </div>

                  {/* Content */}
                  <div className="relative z-10 pt-16 md:pt-24">
                    <div className="mb-6">
                      <Icon
                        className="w-6 h-6 text-danger opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                        strokeWidth={1.5}
                      />
                    </div>

                    <h3 className="inky text-xl md:text-3xl font-semibold text-primary font-[var(--font-heading)] tracking-[-0.02em] mb-4 group-hover:text-white transition-colors">
                      {step.title}
                    </h3>

                    <p className="text-base text-dim leading-relaxed max-w-xs group-hover:text-dim transition-colors font-[var(--font-body)]">
                      {step.desc}
                    </p>
                  </div>
                </div>

                {/* Connecting line (between steps, not after last) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 z-20 w-16">
                    <div
                      ref={(el) => setLineRef(el, i)}
                      className="h-px w-full bg-gradient-to-r from-danger/40 to-danger/10"
                    />
                  </div>
                )}

                {/* Mobile vertical connector */}
                {i < steps.length - 1 && (
                  <div className="md:hidden flex justify-start pl-12 py-2">
                    <div className="w-px h-10 bg-gradient-to-b from-danger/30 to-transparent" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom total latency */}
        <div className="mt-20 flex items-center gap-6">
          <div className="h-px flex-1 bg-gradient-to-r from-danger/30 to-transparent" />
          <span className="text-sm font-mono font-semibold text-danger tracking-[0.15em] uppercase whitespace-nowrap">
            Total Latency: &lt; 300ms
          </span>
        </div>
      </div>
    </section>
  );
}
