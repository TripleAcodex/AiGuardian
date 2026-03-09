"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { Check, Github, ArrowRight } from "lucide-react";

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

export default function PricingV2() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      gsap.from(headerRef.current, {
        y: 30, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: headerRef.current, start: "top 85%", once: true },
      });

      const cards = cardsRef.current?.querySelectorAll(".pricing-card");
      if (cards?.length) {
        gsap.from(cards, {
          y: 40, scale: 0.97, duration: 0.7, stagger: 0.2, ease: "power3.out",
          scrollTrigger: { trigger: cardsRef.current, start: "top 85%", once: true },
        });
      }

      gsap.from(noteRef.current, {
        y: 15, duration: 0.5, ease: "power2.out",
        scrollTrigger: { trigger: noteRef.current, start: "top 95%", once: true },
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
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-danger/[0.04] rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-8">
        {/* Header */}
        <div ref={headerRef} className="mb-24 text-center max-w-3xl mx-auto">
          <span className="text-sm text-danger font-semibold tracking-[0.25em] uppercase block mb-5">
            DEPLOYMENT
          </span>
          <h2
            className="inky font-[var(--font-heading)] font-bold text-primary tracking-[-0.04em] leading-[1.0] mb-6"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            Choose your{" "}
            <span className="text-gradient-light">infrastructure.</span>
          </h2>
          <p className="text-dim text-lg leading-relaxed">
            Cloud for speed. Local for sovereignty. Same AI, different deployment.
          </p>
        </div>

        {/* Two cards */}
        <div ref={cardsRef} className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Cloud Card */}
          <div className="pricing-card group relative p-10 md:p-12 flex flex-col overflow-hidden rounded-2xl border border-danger/20 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl shadow-[0_8px_40px_0_rgba(0,0,0,0.3),_0_0_40px_rgba(255,50,50,0.06)] transition-all duration-500 hover:-translate-y-2 hover:border-danger/30 hover:shadow-[0_12px_50px_0_rgba(0,0,0,0.4),_0_0_60px_rgba(255,50,50,0.1)]">
            {/* Top glow line */}
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-danger/60 to-transparent" />

            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-danger/[0.06] blur-[60px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full">
              {/* Badge */}
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-danger shadow-[0_0_12px_rgba(255,50,50,0.8)] rounded-full animate-pulse" />
                  <span className="text-sm text-danger tracking-[0.2em] uppercase font-bold">
                    Cloud
                  </span>
                </div>
                <span className="text-[10px] text-danger/70 tracking-[0.15em] uppercase font-bold border border-danger/20 bg-danger/10 px-3 py-1 rounded-full">
                  Recommended
                </span>
              </div>

              <h3 className="text-3xl font-bold font-[var(--font-heading)] text-primary tracking-[-0.02em] mb-3">
                Managed Server
              </h3>
              <p className="text-sm text-dim/70 leading-relaxed mb-10 max-w-sm">
                We handle everything. Your cameras stream to our GPU servers.
                Real-time processing. Instant alerts. Zero maintenance.
              </p>

              {/* Price */}
              <div className="mb-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-bold text-white font-mono tracking-[-0.04em]">
                    $29
                  </span>
                  <span className="text-dim/50 text-sm font-medium">/ camera / month</span>
                </div>
                <span className="text-[10px] text-muted/60 uppercase tracking-[0.15em] mt-2 block font-semibold">
                  Volume discounts available
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-3.5 flex-1 mb-10">
                {cloudFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-dim/80">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-danger" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#register"
                className="group/btn w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-danger to-red-600 text-white font-bold text-sm tracking-[0.1em] uppercase rounded-xl hover:shadow-[0_0_40px_rgba(255,50,50,0.3)] transition-all duration-300 border border-white/10"
              >
                Start monitoring
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </a>
            </div>
          </div>

          {/* Local Card */}
          <div className="pricing-card group relative p-10 md:p-12 flex flex-col overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02] transition-all duration-500 hover:-translate-y-2 hover:border-white/[0.1]">
            <div className="relative z-10 flex flex-col h-full">
              {/* Badge */}
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-safe shadow-[0_0_10px_rgba(50,255,100,0.5)] rounded-full" />
                  <span className="text-sm text-safe tracking-[0.2em] uppercase font-bold">
                    Local
                  </span>
                </div>
                <span className="text-[10px] text-safe/50 tracking-[0.15em] uppercase font-bold border border-safe/15 bg-safe/5 px-3 py-1 rounded-full">
                  Self-Hosted
                </span>
              </div>

              <h3 className="text-3xl font-bold font-[var(--font-heading)] text-primary/80 tracking-[-0.02em] mb-3">
                Open Source
              </h3>
              <p className="text-sm text-dim/60 leading-relaxed mb-10 max-w-sm">
                Run on your own hardware. Your data never leaves your building.
                Full sovereignty. 100% offline capable.
              </p>

              {/* Price */}
              <div className="mb-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-bold text-primary/70 font-[var(--font-heading)] tracking-[-0.04em]">
                    Free
                  </span>
                </div>
                <span className="text-[10px] text-muted/50 uppercase tracking-[0.15em] mt-2 block">
                  Open-source forever
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-3.5 flex-1 mb-10">
                {localFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-dim/70">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-safe/10 border border-safe/15 flex items-center justify-center">
                      <Check className="w-3 h-3 text-safe" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="https://github.com/almaz-gazizov/ai-guardian"
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn w-full inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/10 text-primary/80 font-bold text-sm tracking-[0.1em] uppercase rounded-xl hover:border-safe/30 hover:bg-safe/5 hover:text-white transition-all duration-300"
              >
                <Github className="w-4 h-4" />
                View on GitHub
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <p
          ref={noteRef}
          className="text-sm text-muted/60 mt-10 text-center max-w-md mx-auto"
        >
          Both options run the same AI model. Same accuracy. Same speed.
          Different infrastructure.
        </p>
      </div>
    </section>
  );
}
