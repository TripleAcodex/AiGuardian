"use client";

import { useRef } from "react";
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
    alt: "City streets at night with surveillance coverage",
  },
  {
    title: "Schools",
    subtitle: "& Universities",
    desc: "Protecting students without surveillance culture. Skeleton data only, no facial IDs.",
    icon: GraduationCap,
    img: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80",
    alt: "School hallway with safety monitoring",
  },
  {
    title: "Offices",
    subtitle: "& Corporate",
    desc: "Workplace safety compliance. Internal security team notification.",
    icon: Building2,
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    alt: "Modern office building interior",
  },
  {
    title: "Transit",
    subtitle: "& Shopping Malls",
    desc: "High-traffic environments. Multi-camera feeds processed simultaneously.",
    icon: Train,
    img: "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800&q=80",
    alt: "Public transit station with passenger flow",
  },
];

export default function UseCases() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
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

      // Cards batch reveal
      const cards = gridRef.current?.querySelectorAll(".case-card");
      if (cards?.length) {
        gsap.set(cards, { opacity: 0, y: 30 });

        ScrollTrigger.batch(cards, {
          start: "top 90%",
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: 0.5,
              stagger: 0.1,
              ease: "power2.out",
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
        {/* Header -- left-aligned, asymmetric */}
        <div ref={headerRef} className="mb-24">
          <span className="text-sm text-danger font-medium tracking-[0.2em] uppercase block mb-4">
            WHERE IT WORKS
          </span>
          <h2
            className="inky font-[var(--font-heading)] font-semibold text-primary tracking-[-0.03em] leading-[1.0]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            Every space
            <br />
            <span className="text-dim">deserves safety.</span>
          </h2>
        </div>

        {/* Use case grid -- Bento layout */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {cases.map((c, index) => {
            const Icon = c.icon;
            // Bento pattern: make first and last items span 2 columns
            const spanClass = index === 0 || index === 3 ? "md:col-span-2" : "md:col-span-1";
            
            return (
              <div
                key={c.title}
                className={`case-card group relative bg-surface/50 p-10 md:p-14 rounded-2xl border border-white/5 overflow-hidden cursor-default transition-all duration-500 hover:border-white/10 ${spanClass}`}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
                  e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
                }}
              >
                {/* Mouse spotlight effect */}
                <div 
                  className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle 600px at var(--mouse-x, vh) var(--mouse-y, vh), rgba(255,50,50,0.06), transparent 40%)"
                  }}
                />

                {/* Background image -- grayscale, revealed slightly */}
                <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none mix-blend-screen">
                  <img
                    src={c.img}
                    alt={c.alt}
                    className="w-full h-full object-cover grayscale"
                    loading="lazy"
                  />
                </div>

                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    {/* Icon */}
                    <div className="mb-6 inline-flex p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-danger/30 transition-colors duration-300">
                      <Icon className="w-6 h-6 text-primary/70 group-hover:text-danger drop-shadow-md transition-colors duration-300" />
                    </div>

                    <h3 className="text-3xl md:text-3xl font-semibold font-[var(--font-heading)] text-primary/90 tracking-[-0.02em] mb-1 group-hover:text-white transition-colors">
                      {c.title}
                    </h3>
                    <span className="text-sm text-dim/70 font-medium tracking-wide uppercase">
                      {c.subtitle}
                    </span>
                  </div>

                  <p className="text-base text-dim leading-relaxed mt-12 mb-0 max-w-sm">
                    {c.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
