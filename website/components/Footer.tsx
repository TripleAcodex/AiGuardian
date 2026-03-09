"use client";

import { Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-canvas">
      <div className="max-w-[1400px] mx-auto px-8 py-20">
        <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-16">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-6 h-6 bg-danger flex items-center justify-center">
                <span className="text-white text-sm font-semibold">AG</span>
              </div>
              <span className="text-primary font-semibold font-[var(--font-heading)] tracking-tight text-sm uppercase">
                AI Guardian
              </span>
            </div>
            <p className="text-sm text-dim leading-relaxed max-w-xs">
              AI-powered violence detection protecting public spaces, offices, and schools. Real-time. Private. Effective.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm text-primary font-semibold tracking-[0.15em] uppercase mb-6">
              Product
            </h4>
            <ul className="space-y-4">
              {[
                { label: "Features", href: "#features" },
                { label: "Pricing", href: "#pricing" },
                { label: "Demo", href: "#demo" },
                { label: "FAQ", href: "#faq" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="shimmer-hover text-sm text-dim hover:text-primary transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm text-primary font-semibold tracking-[0.15em] uppercase mb-6">
              Resources
            </h4>
            <ul className="space-y-4">
              {[
                { label: "Documentation", href: "#how-it-works" },
                { label: "API Reference", href: "#features" },
                { label: "GitHub", href: "https://github.com" },
                { label: "Blog", href: "#faq" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="shimmer-hover text-sm text-dim hover:text-primary transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm text-primary font-semibold tracking-[0.15em] uppercase mb-6">
              Legal
            </h4>
            <ul className="space-y-4">
              {[
                { label: "Privacy Policy", href: "#faq" },
                { label: "Terms of Service", href: "#faq" },
                { label: "GDPR", href: "#features" },
                { label: "Security", href: "#features" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="shimmer-hover text-sm text-dim hover:text-primary transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} AI Guardian. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://github.com/almaz-gazizov/ai-guardian" className="text-muted hover:text-primary transition-colors" aria-label="GitHub">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
