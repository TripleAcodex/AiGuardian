"use client";

import { useRef, useCallback } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { Map, GraduationCap, Building2, Train } from "lucide-react";

const cases = [
  {
    title: "Streets",
    subtitle: "& Public Spaces",
    desc: "Real-time monitoring of open areas. Alerts to police dispatch within one second.",
    icon: Map,
    img: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80",
    stat: "< 1s",
    statLabel: "Response Time",
  },
  {
    title: "Schools",
    subtitle: "& Universities",
    desc: "Protecting students without surveillance culture. Skeleton data only, no facial IDs.",
    icon: GraduationCap,
    img: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80",
    stat: "0",
    statLabel: "Faces Stored",
  },
  {
    title: "Offices",
    subtitle: "& Corporate",
    desc: "Workplace safety compliance. Internal security team notification.",
    icon: Building2,
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    stat: "24/7",
    statLabel: "Monitoring",
  },
  {
    title: "Transit",
    subtitle: "& Shopping Malls",
    desc: "High-traffic environments. Multi-camera feeds processed simultaneously.",
    icon: Train,
    img: "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800&q=80",
    stat: "∞",
    statLabel: "Cameras",
  },
];

export default function UseCasesV2() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setCardRef = useCallback((el: HTMLDivElement | null, i: number) => {
    cardRefs.current[i] = el;
  }, []);

  useGSAP(
    () => {
      // Header
      gsap.from(headerRef.current, {
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: headerRef.current, start: "top 85%", once: true },
      });

      // Cards stagger
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      if (cards.length) {
        gsap.set(cards, { opacity: 0, y: 50, scale: 0.95 });

        ScrollTrigger.batch(cards, {
          start: "top 90%",
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.7,
              stagger: 0.12,
              ease: "power3.out",
            });
          },
        });
      }
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="use-cases"
      ref={sectionRef}
      className="section-padding relative bg-canvas"
    >
      <div className="max-w-[1400px] mx-auto px-8">
        {/* Header */}
        <div ref={headerRef} className="mb-24 text-center max-w-3xl mx-auto">
          <span className="text-sm text-danger font-semibold tracking-[0.25em] uppercase block mb-5">
            WHERE IT WORKS
          </span>
          <h2
            className="inky font-[var(--font-heading)] font-bold text-primary tracking-[-0.04em] leading-[1.0] mb-6"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            Every space{" "}
            <span className="text-gradient-light">deserves safety.</span>
          </h2>
          <p className="text-dim text-lg leading-relaxed max-w-lg mx-auto">
            From open streets to secure facilities — AI Guardian adapts to any environment.
          </p>
        </div>

        {/* Use case grid — Bento layout */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {cases.map((c, index) => {
            const Icon = c.icon;
            const spanClass = index === 0 || index === 3 ? "md:col-span-2" : "md:col-span-1";

            return (
              <div
                key={c.title}
                ref={(el) => setCardRef(el, index)}
                className={`group relative bg-surface/30 rounded-2xl border border-white/[0.04] overflow-hidden cursor-default transition-all duration-500 hover:border-white/[0.08] hover:-translate-y-1 ${spanClass}`}
                style={{ minHeight: "340px" }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
                  e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
                }}
              >
                {/* Mouse spotlight */}
                <div
                  className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: "radial-gradient(1000px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 75, 75, 0.12), transparent 40%)"
                  }}
                />

                {/* Tactical grid background overlay */}
                 <div 
                  className="absolute inset-0 pointer-events-none z-0 opacity-20"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(255,75,75,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,75,75,0.1) 1px, transparent 1px)`,
                    backgroundSize: '2rem 2rem'
                  }}
                />

                {/* Background image */}
                <div className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.15] transition-opacity duration-700 pointer-events-none z-0">
                  <img
                    src={c.img}
                    alt=""
                    className="w-full h-full object-cover grayscale mix-blend-screen scale-105 group-hover:scale-100 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>

                {/* Top gradient for readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#020202]/95 via-[#020202]/80 to-[#020202]/95 pointer-events-none z-[1]" />

                <div className="relative z-10 h-full flex flex-col justify-between p-10 md:p-12">
                  <div>
                    {/* Icon */}
                    <div className="mb-8">
                      <div className="inline-flex p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] group-hover:border-[#FF4B4B]/30 group-hover:bg-[#FF4B4B]/10 transition-all duration-500 group-hover:shadow-[0_0_15px_rgba(255,75,75,0.3)]">
                        <Icon className="w-6 h-6 text-white/50 group-hover:text-[#FF4B4B] transition-colors duration-300" />
                      </div>
                    </div>

                    <h3 className="text-3xl font-bold font-[var(--font-heading)] text-primary/90 tracking-[-0.02em] mb-1 group-hover:text-white transition-colors duration-300">
                      {c.title}
                    </h3>
                    <span className="text-[11px] text-dim/50 font-semibold tracking-[0.15em] uppercase">
                      {c.subtitle}
                    </span>
                  </div>

                  <div className="flex items-end justify-between gap-6 mt-10">
                    <p className="text-sm text-dim/80 leading-relaxed max-w-sm group-hover:text-dim transition-colors">
                      {c.desc}
                    </p>
                    {/* Stat badge */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-lg font-bold font-mono text-white/80 tabular-nums group-hover:text-danger transition-colors duration-300">
                        {c.stat}
                      </div>
                      <div className="text-[9px] text-muted/60 uppercase tracking-[0.15em]">
                        {c.statLabel}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
