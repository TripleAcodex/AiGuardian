"use client";

import { useState, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* Initialize mobile menu as collapsed */
  useEffect(() => {
    if (menuRef.current) {
      gsap.set(menuRef.current, { height: 0, opacity: 0, overflow: "hidden" });
    }
  }, []);

  /* Animate mobile menu open / close */
  useEffect(() => {
    if (!menuRef.current) return;

    if (mobileOpen) {
      gsap.to(menuRef.current, {
        height: "auto",
        opacity: 1,
        duration: 0.45,
        ease: "power3.out",
      });
    } else {
      gsap.to(menuRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power3.in",
      });
    }
  }, [mobileOpen]);

  const links = [
    { label: "How It Works", href: "#how-it-works" },
    { label: "Use Cases", href: "#use-cases" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-canvas/80 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
          : "bg-white/[0.02] backdrop-blur-xl border-b border-white/[0.04]"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-4 group" data-cursor-hover>
          <div className="w-6 h-6 border border-danger flex items-center justify-center transition-colors duration-300 group-hover:bg-danger/10">
            <div className="w-2 h-2 bg-danger" />
          </div>
          <span className="inky text-primary font-semibold text-sm tracking-[0.12em] uppercase font-[var(--font-heading)]">
            AI Guardian
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-14">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="shimmer-hover text-sm text-dim tracking-[0.08em] uppercase font-[var(--font-heading)]"
              data-cursor-hover
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="shimmer-hover text-sm text-dim tracking-[0.08em] uppercase font-[var(--font-heading)] px-4 py-2"
            data-cursor-hover
          >
            Login
          </Link>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-4 px-8 py-4 bg-[#FF4B4B] text-white text-sm font-semibold tracking-[0.08em] uppercase transition-all duration-300 hover:bg-[#e03a3a] hover:shadow-[0_0_20px_rgba(255,75,75,0.4)] font-sans"
            data-cursor-hover
          >
            Enter Dashboard
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden w-10 h-10 flex items-center justify-center text-primary"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className="w-5 h-5" strokeWidth={2} />
          ) : (
            <Menu className="w-5 h-5" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        ref={menuRef}
        className="md:hidden bg-canvas/95 backdrop-blur-xl border-b border-white/[0.04]"
      >
        <div className="px-8 py-8 flex flex-col gap-6">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="shimmer-hover text-dim py-2 text-sm uppercase tracking-[0.08em] font-[var(--font-heading)]"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="shimmer-hover text-dim py-2 text-sm uppercase tracking-[0.08em] font-[var(--font-heading)]"
          >
            Login
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="shimmer-btn mt-4 w-full inline-flex items-center justify-center gap-4 py-4 bg-danger text-white text-sm font-semibold uppercase tracking-[0.08em] font-[var(--font-heading)]"
          >
            Enter Dashboard
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </header>
  );
}
