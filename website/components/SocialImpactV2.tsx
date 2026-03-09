"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";

interface TimelineStep {
  label: string;
  time: string;
  isInstant?: boolean;
}

const withoutSteps: TimelineStep[] = [
  { label: "Violence occurs", time: "" },
  { label: "Witness notices", time: "2–5 min" },
  { label: "Calls emergency line", time: "1–2 min" },
  { label: "Dispatch processes", time: "3–5 min" },
  { label: "Officers dispatched", time: "2–3 min" },
  { label: "Police arrive on scene", time: "5–15 min" },
];

const withSteps: TimelineStep[] = [
  { label: "Violence occurs", time: "" },
  { label: "YOLOv11 detects skeleton", time: "0.1s", isInstant: true },
  { label: "GCN confirms violence", time: "0.2s", isInstant: true },
  { label: "Alert sent via Telegram", time: "instant", isInstant: true },
  { label: "Security responds", time: "1–3 min" },
];

function TimelineColumn({
  title,
  steps,
  totalTime,
  totalLabel,
  variant,
  className,
}: {
  title: string;
  steps: TimelineStep[];
  totalTime: string;
  totalLabel: string;
  variant: "danger" | "safe";
  className?: string;
}) {
  const colRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!colRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(colRef.current);
    return () => observer.disconnect();
  }, []);

  const accentColor = variant === "danger" ? "text-danger" : "text-safe";
  const borderColor = variant === "danger" ? "border-danger/20" : "border-safe/20";
  const bgGlow = variant === "danger" ? "bg-danger/[0.03]" : "bg-safe/[0.03]";
  const lineColor = variant === "danger" ? "bg-danger/30" : "bg-safe/30";
  const dotColor = variant === "danger" ? "bg-danger/60" : "bg-safe/60";

  return (
    <div
      ref={colRef}
      className={`premium-glass-card rounded-2xl p-8 md:p-10 relative overflow-hidden ${className}`}
    >
      {/* Background glow */}
      <div className={`absolute inset-0 ${bgGlow} pointer-events-none`} />

      <div className="relative z-10">
        {/* Column header */}
        <div className="mb-8">
          <span
            className={`text-xs font-semibold tracking-[0.2em] uppercase ${accentColor}`}
          >
            {title}
          </span>
        </div>

        {/* Timeline */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <div
              key={step.label}
              className="flex items-start gap-4"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(12px)",
                transition: `all 0.5s ease ${i * 0.15}s`,
              }}
            >
              {/* Timeline rail */}
              <div className="flex flex-col items-center flex-shrink-0 pt-1.5">
                <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                {i < steps.length - 1 && (
                  <div className={`w-px h-12 ${lineColor}`} />
                )}
              </div>

              {/* Content */}
              <div className="pb-6 min-w-0">
                <p className="text-sm text-primary/90 font-medium leading-tight">
                  {step.label}
                </p>
                {step.time && (
                  <span
                    className={`inline-block mt-1.5 text-xs font-mono font-semibold tracking-wide ${
                      step.isInstant
                        ? `${accentColor} bg-white/[0.04] px-2 py-0.5 rounded`
                        : "text-muted"
                    }`}
                  >
                    {step.isInstant ? step.time : `+${step.time}`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Total time */}
        <div className={`mt-4 pt-6 border-t ${borderColor}`}>
          <div className="flex items-baseline gap-3">
            <span
              className={`text-3xl md:text-4xl font-bold font-mono tracking-tight ${accentColor}`}
            >
              {totalTime}
            </span>
          </div>
          <span className="text-xs text-muted uppercase tracking-[0.15em] mt-1 block">
            {totalLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SocialImpactV2() {
  const sectionRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const compRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.to(glowRef.current, {
        opacity: 0.06,
        duration: 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      gsap.from(headerRef.current, {
        y: 30,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: headerRef.current, start: "top 85%", once: true },
      });

      gsap.from(compRef.current, {
        y: 40,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: compRef.current, start: "top 85%", once: true },
      });

      gsap.from(quoteRef.current, {
        y: 30,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: quoteRef.current, start: "top 85%", once: true },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="impact"
      ref={sectionRef}
      className="section-padding relative bg-canvas overflow-hidden"
    >
      {/* Pulsing glow orb */}
      <div
        ref={glowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-danger rounded-full blur-[200px] pointer-events-none opacity-[0.03]"
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-8">
        {/* Header */}
        <div ref={headerRef} className="mb-20">
          <span className="text-sm text-danger font-medium tracking-[0.2em] uppercase block mb-4">
            The Problem
          </span>
          <h2
            className="inky font-[var(--font-heading)] font-semibold text-primary tracking-[-0.03em] leading-[1.0]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            Every second
            <br />
            <span className="text-primary text-glow">saves lives.</span>
          </h2>
        </div>

        {/* Before / After comparison */}
        <div ref={compRef} className="grid md:grid-cols-2 gap-6 mb-20">
          <TimelineColumn
            title="Without AI Guardian"
            steps={withoutSteps}
            totalTime="15—30 min"
            totalLabel="Average total response time"
            variant="danger"
          />
          <TimelineColumn
            title="With AI Guardian"
            steps={withSteps}
            totalTime="< 2 min"
            totalLabel="Alert to response"
            variant="safe"
          />
        </div>

        {/* Quote */}
        <div
          ref={quoteRef}
          className="max-w-3xl border-l-2 border-danger/40 pl-8 md:pl-12"
        >
          <p className="text-xl text-dim leading-relaxed font-light mb-4">
            &ldquo;Violence doesn&rsquo;t wait for help to arrive. The gap
            between incident and response is where lives are lost.&rdquo;
          </p>
          <span className="text-sm text-dim uppercase tracking-[0.15em]">
            &mdash; WHO Global Violence Report, 2024
          </span>
        </div>
      </div>
    </section>
  );
}
