"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";

function AnimatedNumber({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const isDecimal = target % 1 !== 0;

  useGSAP(
    () => {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.5,
        ease: "power3.out",
        onUpdate: () => setValue(isDecimal ? parseFloat(obj.val.toFixed(1)) : Math.floor(obj.val)),
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          once: true,
        },
      });
    },
    { scope: ref }
  );

  return (
    <span ref={ref}>
      {isDecimal ? value.toFixed(1) : value.toLocaleString()}
      {suffix}
    </span>
  );
}

const stats = [
  {
    value: 1400000,
    display: "~1.4M",
    label: "Annual violence deaths worldwide",
    source: "WHO",
  },
  {
    value: 15,
    display: "15",
    suffix: " min",
    label: "Average urban response time",
    source: "DOJ",
  },
  {
    value: 73,
    display: "73",
    suffix: "%",
    label: "Preventable with faster intervention",
    source: "Research",
  },
  {
    value: 0.3,
    display: "<0.3",
    suffix: "s",
    label: "AI Guardian alert delivery",
    source: "Our System",
  },
];

export default function SocialImpact() {
  const sectionRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Pulsing glow orb -- infinite
      gsap.to(glowRef.current, {
        opacity: 0.06,
        duration: 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      // Header slide-in
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

      // Stats stagger
      const statItems = statsRef.current?.querySelectorAll(".stat-item");
      if (statItems?.length) {
        gsap.from(statItems, {
          opacity: 0,
          y: 30,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: statsRef.current,
            start: "top 85%",
            once: true,
          },
        });
      }

      // Quote slide-up
      gsap.from(quoteRef.current, {
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: {
          trigger: quoteRef.current,
          start: "top 85%",
          once: true,
        },
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
      {/* Perspective grid floor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[70%]"
          style={{
            perspective: "600px",
            perspectiveOrigin: "50% 0%",
          }}
        >
          <div
            className="w-full h-full origin-top"
            style={{
              transform: "rotateX(55deg)",
              backgroundImage:
                "linear-gradient(oklch(65% 0.15 25 / 0.15) 1px, transparent 1px), linear-gradient(90deg, oklch(65% 0.15 25 / 0.15) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
              maskImage:
                "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
            }}
          />
        </div>
        {/* Horizon glow */}
        <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2 w-[600px] h-[2px] bg-gradient-to-r from-transparent via-danger/20 to-transparent blur-[2px]" />
      </div>

      {/* Pulsing glow orb */}
      <div
        ref={glowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-danger rounded-full blur-[200px] pointer-events-none opacity-[0.03]"
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-8">
        {/* Header */}
        <div ref={headerRef} className="mb-24">
          <span className="text-sm text-danger font-medium tracking-[0.2em] uppercase block mb-4">
            THE PROBLEM
          </span>
          <h2
            className="inky font-[var(--font-heading)] font-semibold text-primary tracking-[-0.03em] leading-[1.0]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            Every second
            <br />
            <span className="inky-red">saves lives.</span>
          </h2>
        </div>

        {/* Stats -- 4 columns, big numbers */}
        <div
          ref={statsRef}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-24"
        >
          {stats.map((s) => (
            <div key={s.label} className="stat-item group premium-glass-card p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-danger/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="text-3xl font-semibold font-[var(--font-heading)] font-mono text-danger tracking-[-0.03em] mb-4 tabular-nums leading-none drop-shadow-[0_0_15px_rgba(255,50,50,0.5)]">
                  {s.value >= 1000 ? (
                    <>
                      ~<AnimatedNumber target={parseFloat((s.value / 1000000).toFixed(1))} suffix="M" />
                    </>
                  ) : s.value < 1 ? (
                    <>
                      {"<"}
                      <AnimatedNumber target={s.value} suffix={s.suffix ?? ""} />
                    </>
                  ) : (
                    <AnimatedNumber target={s.value} suffix={s.suffix ?? ""} />
                  )}
                </div>
                <p className="text-sm text-primary/80 leading-relaxed font-medium">
                  {s.label}
                </p>
                <div className="h-px w-full bg-white/10 my-3" />
                <span className="text-xs text-muted uppercase tracking-[0.2em] block font-semibold">
                  {s.source}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Quote -- asymmetric, left-aligned */}
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
