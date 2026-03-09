"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { Github, ArrowUpRight, Shield } from "lucide-react";

export default function FooterV2() {
  const footerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (contentRef.current) {
      gsap.from(contentRef.current, {
        opacity: 0, y: 30, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: contentRef.current, start: "top 95%", once: true },
      });
    }
  }, { scope: footerRef });

  return (
    <footer ref={footerRef} className="relative border-t border-white/[0.04] bg-canvas">
      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-danger/20 to-transparent" />

      <div ref={contentRef} className="max-w-[1400px] mx-auto px-8 py-20">
        <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-16">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 bg-danger/90 rounded flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-primary font-bold font-[var(--font-heading)] tracking-[0.1em] text-sm uppercase">
                AI Guardian
              </span>
            </div>
            <p className="text-sm text-dim/70 leading-relaxed max-w-xs mb-6">
              AI-powered violence detection protecting public spaces, offices, and schools. Real-time. Private. Effective.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/almaz-gazizov/ai-guardian"
                className="w-9 h-9 rounded-lg border border-white/[0.06] flex items-center justify-center text-dim/60 hover:text-danger hover:border-danger/20 transition-all duration-300"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[11px] text-primary/60 font-bold tracking-[0.2em] uppercase mb-6">
              Product
            </h4>
            <ul className="space-y-3">
              {[
                { label: "How It Works", href: "#how-it-works" },
                { label: "Use Cases", href: "#use-cases" },
                { label: "Pricing", href: "#pricing" },
                { label: "Demo", href: "#demo" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="group inline-flex items-center gap-1.5 text-sm text-dim/60 hover:text-white transition-colors duration-300">
                    {l.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-[11px] text-primary/60 font-bold tracking-[0.2em] uppercase mb-6">
              Resources
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Documentation", href: "#how-it-works" },
                { label: "API Reference", href: "#" },
                { label: "GitHub", href: "https://github.com/almaz-gazizov/ai-guardian" },
                { label: "FAQ", href: "#faq" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="group inline-flex items-center gap-1.5 text-sm text-dim/60 hover:text-white transition-colors duration-300">
                    {l.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[11px] text-primary/60 font-bold tracking-[0.2em] uppercase mb-6">
              Legal
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Privacy Policy", href: "#" },
                { label: "Terms of Service", href: "#" },
                { label: "GDPR Compliance", href: "#" },
                { label: "Security", href: "#" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="group inline-flex items-center gap-1.5 text-sm text-dim/60 hover:text-white transition-colors duration-300">
                    {l.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.04] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-muted/40 font-mono">
            &copy; {new Date().getFullYear()} AI Guardian. Built for Infomatrix 2026.
          </p>
          <p className="text-[11px] text-muted/30 font-mono">
            Protecting lives with AI
          </p>
        </div>
      </div>
    </footer>
  );
}
