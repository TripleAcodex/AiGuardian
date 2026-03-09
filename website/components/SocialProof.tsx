"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

const testimonials = [
  {
    text: "AI Guardian reduced response times from 4 minutes to under 5 seconds. The inference speed is unbelievable.",
    author: "Elena R.",
    role: "Chief Security Officer, UniCampus",
    certified: true,
  },
  {
    text: "No facial recognition was a must for our GDPR compliance. This product solved our ethical and security dilemmas instantly.",
    author: "David M.",
    role: "Director of Ops, SafeCity Init",
    certified: true,
  },
  {
    text: "Implementation took hours, not weeks. The HPI-GCN core integrated with our existing RTSP streams flawlessly.",
    author: "Dr. Almaz",
    role: "Lead Engineer, TechGuard Group",
    certified: true,
  },
  {
    text: "During the first month, AI Guardian identified an altercation behind the main hall and alerted security before escalation. It works.",
    author: "Sarah J.",
    role: "Head Administrator, District 9 School",
    certified: true,
  }
];

export default function SocialProof() {
  const containerRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!marqueeRef.current) return;
      gsap.to(marqueeRef.current, {
        xPercent: -50,
        repeat: -1,
        duration: 30,
        ease: "linear",
      });
    },
    { scope: containerRef }
  );

  return (
    <section ref={containerRef} className="relative py-24 border-y border-border overflow-hidden bg-canvas">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(65%_0.15_25/0.05),transparent_50%)] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-8 lg:px-16 mb-16 text-center">
        <h2 className="text-sm text-danger font-medium tracking-[0.2em] uppercase mb-4 font-[var(--font-heading)]">
          Social Proof
        </h2>
        <p className="text-3xl lg:text-4xl inky font-semibold text-primary font-[var(--font-heading)] tracking-[-0.04em]">
          Protecting <span className="text-dim">15+</span> Campuses Worldwide.
        </p>
      </div>

      <div className="relative w-full overflow-hidden flex items-center">
        {/* Left/Right Fades */}
        <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-canvas to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-canvas to-transparent z-10 pointer-events-none" />

        {/* Marquee Track (Double array for seamless loop) */}
        <div
          ref={marqueeRef}
          className="flex items-center gap-8 w-[200vw] min-w-max hover:[animation-play-state:paused]"
        >
          {[...testimonials, ...testimonials].map((t, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 w-[400px] p-8 rounded-2xl border border-border bg-surface hover:border-danger/20 transition-colors duration-300"
            >
              <p className="text-base text-primary leading-relaxed mb-8 font-[var(--font-body)] font-medium">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-primary font-[var(--font-heading)]">
                    {t.author}
                  </h4>
                  <p className="text-xs text-dim">{t.role}</p>
                </div>
                {t.certified && (
                  <div className="flex bg-danger/10 border border-danger/20 rounded-full px-3 py-1 items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-danger" />
                    <span className="text-[10px] text-danger uppercase tracking-[0.1em] font-mono">Verified Deploy</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
