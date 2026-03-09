"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { Check } from "lucide-react";
import LiquidGlass from "@/components/LiquidGlass";

const cloudFeatures = [
  "Zero hardware investment",
  "Managed GPU inference servers",
  "Cloud dashboard & analytics",
  "Telegram + SMS + Webhook alerts",
  "Multi-zone monitoring",
  "99.9% uptime SLA",
  "Priority support",
];

const localFeatures = [
  "Unlimited cameras (GPU limited)",
  "Full source code access",
  "Telegram bot alerts",
  "Local dashboard interface",
  "Video file upload for testing",
  "Privacy by design — no cloud",
  "Community support",
];

export default function Pricing() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);

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

      // Cards stagger
      const cards = cardsRef.current?.querySelectorAll(".pricing-card");
      if (cards?.length) {
        gsap.from(cards, {
          opacity: 0,
          y: 40,
          duration: 0.6,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: cardsRef.current,
            start: "top 85%",
            once: true,
          },
        });
      }

      // Bottom note fade-in
      gsap.from(noteRef.current, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: noteRef.current,
          start: "top 95%",
          once: true,
        },
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="section-padding relative bg-canvas overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-danger/[0.03] rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-8">
        {/* Header -- left-aligned, asymmetric */}
        <div ref={headerRef} className="mb-24">
          <span className="text-sm text-danger font-medium tracking-[0.2em] uppercase block mb-4">
            DEPLOYMENT
          </span>
          <h2
            className="inky font-[var(--font-heading)] font-semibold text-primary tracking-[-0.03em] leading-[1.0]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            Choose your
            <br />
            <span className="text-dim">infrastructure.</span>
          </h2>
          <p className="text-dim text-base leading-relaxed mt-6 max-w-lg">
            Cloud for speed. Local for sovereignty.
          </p>
        </div>

        {/* Two cards side by side */}
        <div ref={cardsRef} className="grid md:grid-cols-2 gap-8">
          {/* Cloud Card */}
          <div className="pricing-card relative p-10 md:p-14 flex flex-col overflow-hidden rounded-2xl bg-surface/40 backdrop-blur-xl border border-danger/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.3),_inset_0_1px_0_0_rgba(255,255,255,0.05),_0_0_40px_rgba(255,50,50,0.1)] transition-transform hover:-translate-y-2 duration-500 z-10">
            <LiquidGlass intensity={4} speed={5} />
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-danger to-transparent opacity-80" />
            
            <div className="relative z-10 flex flex-col h-full">
              {/* Badge + label */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-danger shadow-[0_0_10px_rgba(255,50,50,0.8)] rounded-full animate-pulse" />
                  <span className="text-sm text-danger tracking-[0.2em] uppercase font-bold text-glow-red">
                    Cloud
                  </span>
                </div>
                <span className="text-xs text-danger/80 tracking-[0.15em] uppercase font-bold border border-danger/30 bg-danger/10 px-4 py-1.5 rounded-full shadow-[inset_0_0_10px_rgba(255,50,50,0.1)]">
                  Recommended
                </span>
              </div>

              <h3 className="text-3xl md:text-3xl font-semibold font-[var(--font-heading)] text-primary tracking-[-0.02em] mb-2 drop-shadow-md">
                Managed Server
              </h3>
              <p className="text-dim/80 text-base leading-relaxed mb-8 max-w-sm">
                We handle everything. Your cameras stream to our GPU servers.
                Real-time processing. Instant alerts. Zero maintenance.
              </p>

              {/* Price */}
              <div className="mb-10">
                <div className="flex items-baseline gap-4">
                  <span className="text-3xl md:text-6xl font-semibold text-primary font-mono font-[var(--font-heading)] tracking-[-0.03em] drop-shadow-xl">
                    $29
                  </span>
                  <span className="text-dim/60 text-sm font-medium">/ camera / month</span>
                </div>
                <span className="text-xs text-muted uppercase tracking-[0.15em] mt-2 block font-semibold">
                  Volume discounts available
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-4 flex-1 mb-10">
                {cloudFeatures.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-4 text-sm text-dim/90 font-medium"
                  >
                    <div className="bg-danger/10 p-1 rounded-full border border-danger/20">
                      <Check className="w-3.5 h-3.5 text-danger flex-shrink-0" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#register"
                className="w-full inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-danger to-red-600 text-white font-bold text-sm tracking-widest uppercase rounded-lg hover:shadow-[0_0_30px_rgba(255,50,50,0.4),_inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-300 border border-white/10"
              >
                Start monitoring
              </a>
            </div>
          </div>

          {/* Local Card */}
          <div className="pricing-card relative p-10 md:p-14 flex flex-col overflow-hidden rounded-2xl bg-surface/20 border border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-2 duration-500">
            <LiquidGlass intensity={4} speed={6} />
            <div className="relative z-10 flex flex-col h-full opacity-80 hover:opacity-100 transition-opacity">
              {/* Badge + label */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-safe shadow-[0_0_10px_rgba(50,255,100,0.5)] rounded-full" />
                  <span className="text-sm text-safe tracking-[0.2em] uppercase font-bold text-shadow-sm">
                    Local
                  </span>
                </div>
                <span className="text-xs text-safe/60 tracking-[0.15em] uppercase font-bold border border-safe/20 bg-safe/5 px-4 py-1.5 rounded-full">
                  Self-Hosted
                </span>
              </div>

              <h3 className="text-3xl md:text-3xl font-semibold font-[var(--font-heading)] text-primary/80 tracking-[-0.02em] mb-2">
                Open Source
              </h3>
              <p className="text-dim/70 text-base leading-relaxed mb-8 max-w-sm">
                Run on your own hardware. Your data never leaves your building.
                Full sovereignty. 100% offline capable.
              </p>

              {/* Price */}
              <div className="mb-10">
                <div className="flex items-baseline gap-4">
                  <span className="text-3xl md:text-6xl font-semibold text-primary/80 font-[var(--font-heading)] tracking-[-0.03em]">
                    Free
                  </span>
                </div>
                <span className="text-sm text-muted uppercase tracking-[0.15em] mt-1 block">
                  Open-source forever
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-4 flex-1 mb-10">
                {localFeatures.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-4 text-sm text-dim/90 font-medium"
                  >
                    <div className="bg-safe/10 p-1 rounded-full border border-safe/20">
                      <Check className="w-3.5 h-3.5 text-safe flex-shrink-0" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-8 py-4 border border-white/10 text-primary font-bold text-sm tracking-widest uppercase rounded-lg hover:border-safe/40 hover:bg-safe/5 hover:shadow-[0_0_20px_rgba(50,255,100,0.1)] transition-all duration-300"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <p
          ref={noteRef}
          className="text-sm text-muted mt-8 max-w-md"
        >
          Both options run the same AI model. Same accuracy. Same speed.
          Different infrastructure.
        </p>
      </div>
    </section>
  );
}
