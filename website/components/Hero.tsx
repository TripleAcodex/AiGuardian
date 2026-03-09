"use client";

import { useRef, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { splitTextIntoWords } from "@/lib/useSplitText";
import { ArrowDown } from "lucide-react";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const scrollLineRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      /* ── Split-text headline animation ── */
      if (headlineRef.current) {
        const words = splitTextIntoWords(headlineRef.current);
        gsap.to(words, {
          y: 0,
          duration: 0.8,
          stagger: 0.06,
          ease: "power3.out",
          delay: 0.3,
        });
      }

      /* ── Entrance timeline for other elements ── */
      const tl = gsap.timeline({ delay: 0.1 });

      tl.from(eyebrowRef.current, {
        opacity: 0,
        x: -20,
        duration: 0.7,
        ease: "power2.out",
      })
        .from(
          subRef.current,
          {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: "power2.out",
          },
          0.9
        )
        .from(
          ctaRef.current,
          {
            opacity: 0,
            y: 20,
            duration: 0.7,
            ease: "power2.out",
          },
          1.1
        );

      /* ── Scroll indicator ── */
      if (scrollIndicatorRef.current) {
        gsap.from(scrollIndicatorRef.current, {
          opacity: 0,
          duration: 0.6,
          delay: 1.8,
          ease: "power2.out",
        });
      }

      if (scrollLineRef.current) {
        gsap.fromTo(
          scrollLineRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut",
          }
        );
      }
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-end pb-24 overflow-hidden bg-canvas section-padding"
    >
      {/* Background Video with Premium Masking & Vignette */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-canvas">
        <video
          className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover object-center opacity-60 mix-blend-screen"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/hero_bg.mp4" type="video/mp4" />
        </video>
        {/* Strong Vignette to keep text readable */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-canvas)_70%)] z-10 mix-blend-normal" />
      </div>

      {/* Perspective grid floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none opacity-[0.03] z-[1]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          transform: "perspective(500px) rotateX(60deg)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)"
        }}
      />

      {/* Dark gradient overlay for bottom text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/80 to-transparent z-[2] pointer-events-none h-[60%] mt-auto" />

      {/* Content — symmetric layout */}
      <div className="relative z-20 w-full max-w-[1400px] mx-auto px-8 lg:px-16 flex items-center justify-center text-center mt-32">
        <div className="max-w-4xl flex flex-col items-center">
          {/* Eyebrow Pill */}
          <div ref={eyebrowRef} className="flex justify-center items-center gap-3 mb-8 px-4 py-2 rounded-full border border-danger/20 bg-danger/5 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_0_20px_0_oklch(65%_0.15_25_/_0.15)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-danger" />
            </span>
            <span className="text-[10px] text-danger font-medium tracking-[0.2em] uppercase font-[var(--font-heading)] glow-red">
              AI-Powered Threat Detection
            </span>
          </div>

          {/* Headline */}
          <h1
            ref={headlineRef}
            className="font-[var(--font-heading)] font-semibold text-primary/80 leading-[1.05] tracking-tighter mb-8 text-glow"
            style={{ fontSize: "clamp(3.5rem, 7vw, 6.5rem)", letterSpacing: "-0.04em" }}
          >
            People die because <br/>
            <span className="text-white text-gradient-light drop-shadow-2xl">help arrives too late.</span>
          </h1>

          {/* Subheadline (Restrained width for better reading) */}
          <p
            ref={subRef}
            className="text-[17px] text-dim leading-[1.6] mb-12 mx-auto max-w-[620px] font-[var(--font-body)] font-medium"
          >
            AI Guardian uses two-stage AI: skeleton detection +
            graph neural network. Violence confirmed in under one second.{" "}
            <span className="text-muted block mt-2 opacity-80">
              No facial recognition. No stored footage. Just protection.
            </span>
          </p>

          {/* CTAs */}
          <div ref={ctaRef} className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="#demo"
              className="group inline-flex items-center gap-2 px-7 py-3.5 bg-white text-canvas font-semibold text-[13px] tracking-wide rounded-md transition-all duration-300 hover:bg-neutral-200 hover:scale-[1.02] shadow-[0_0_40px_rgba(255,255,255,0.1),_inset_0_1px_0_rgba(255,255,255,1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2),_inset_0_1px_0_rgba(255,255,255,1)]"
              data-cursor-hover
            >
              <span className="relative z-10">Try Live Demo</span>
              <ArrowDown className="relative z-10 w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" strokeWidth={2.5} />
            </a>
            <a
              href="/login"
              className="btn-premium inline-flex items-center gap-4 px-7 py-3.5 bg-surface/30 text-dim text-[13px] font-medium tracking-wide hover:text-primary transition-all duration-300 rounded-md backdrop-blur-xl"
              data-cursor-hover
            >
              Enter Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4"
      >
        <span className="text-sm text-dim uppercase tracking-[0.3em] font-[var(--font-mono)]">
          Scroll
        </span>
        <div
          ref={scrollLineRef}
          className="w-px h-16 bg-danger/40 origin-top"
        />
      </div>
    </section>
  );
}
