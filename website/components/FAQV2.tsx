"use client";

import { useState, useRef, useEffect, useCallback, createRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "How fast does the alert reach authorities?",
    a: "From the moment violence is detected, an alert is sent within 0.3 seconds via Telegram, SMS, or webhook. Total time from incident start to notification delivery is typically under 1 second.",
  },
  {
    q: "Does it store video recordings?",
    a: "By default \u2014 no. It processes frames in real-time and only stores anonymous skeleton data for classification. You can optionally enable clip recording for incident review.",
  },
  {
    q: "Does it work at night?",
    a: "Yes. YOLOv11-Pose detection works with infrared cameras and low-light conditions. We recommend cameras with built-in IR for best night-time performance.",
  },
  {
    q: "What about false positives?",
    a: "Two-stage verification minimizes false alerts. Stage 1 (YOLOv11-Pose) flags suspicious motion, then Stage 2 (HPI-GCN-RP graph neural network) analyzes the full motion sequence over 2 seconds before confirming. This prevents hugs or handshakes from triggering alerts.",
  },
  {
    q: "Is facial recognition used?",
    a: "No. AI Guardian uses pose skeleton analysis only \u2014 body keypoints, not faces. Privacy-by-design. No personal identification data collected or stored. GDPR compliant.",
  },
  {
    q: "Existing CCTV integration?",
    a: "Supports RTSP, MJPEG, USB feeds. Works alongside your existing security infrastructure without camera replacement.",
  },
  {
    q: "Can I test it with a video file?",
    a: "Yes. You can upload any video file through the dashboard. Enter the file path as a camera source and the system will analyze it frame by frame, just like a live feed.",
  },
  {
    q: "Hardware requirements?",
    a: "Basic: any modern computer with a webcam. Production: NVIDIA GPU (GTX 1650+) for real-time performance at 30+ FPS. Or use our cloud option where we provide the GPU.",
  },
];

export default function FAQV2() {
  const [open, setOpen] = useState<number | null>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const accordionRef = useRef<HTMLDivElement>(null);

  const contentRefs = useRef<Array<React.RefObject<HTMLDivElement | null>>>(
    faqs.map(() => createRef<HTMLDivElement>())
  );

  useGSAP(() => {
    gsap.from(headingRef.current, {
      opacity: 0, y: 40, duration: 0.8, ease: "power3.out",
      scrollTrigger: { trigger: headingRef.current, start: "top 85%", once: true },
    });

    const faqItems = accordionRef.current?.querySelectorAll(".faq-item");
    if (faqItems?.length) {
      gsap.from(faqItems, {
        opacity: 0, y: 20, duration: 0.4, stagger: 0.06, ease: "power2.out",
        scrollTrigger: { trigger: accordionRef.current, start: "top 85%", once: true },
      });
    }
  }, { scope: sectionRef });

  const prevOpen = useRef<number | null>(null);

  const animateOpen = useCallback((index: number) => {
    const content = contentRefs.current[index]?.current;
    if (!content) return;
    gsap.set(content, { display: "block" });
    gsap.fromTo(content, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.35, ease: "power3.out" });
  }, []);

  const animateClose = useCallback((index: number) => {
    const content = contentRefs.current[index]?.current;
    if (!content) return;
    gsap.to(content, {
      height: 0, opacity: 0, duration: 0.25, ease: "power3.in",
      onComplete: () => { gsap.set(content, { display: "none" }); },
    });
  }, []);

  useEffect(() => {
    const prev = prevOpen.current;
    if (prev !== null && prev !== open) animateClose(prev);
    if (open !== null && open !== prev) animateOpen(open);
    prevOpen.current = open;
  }, [open, animateClose, animateOpen]);

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="section-padding relative bg-canvas"
    >
      <div className="max-w-[1400px] mx-auto px-8">
        <div className="grid md:grid-cols-[1fr_1.5fr] gap-16 md:gap-24">
          {/* Left: heading */}
          <div ref={headingRef} className="md:sticky md:top-32 md:self-start">
            <span className="text-sm text-danger font-semibold tracking-[0.25em] uppercase block mb-5">
              FAQ
            </span>
            <h2
              className="font-[var(--font-heading)] font-bold text-primary tracking-[-0.04em] leading-[1.0] mb-6"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            >
              Common
              <br />
              <span className="text-gradient-light">questions.</span>
            </h2>
            <p className="text-dim text-base leading-relaxed max-w-xs">
              Everything you need to know about AI Guardian.
              Can&rsquo;t find an answer? Reach out.
            </p>

            {/* Contact CTA */}
            <a
              href="mailto:hello@aiguardian.dev"
              className="mt-8 inline-flex items-center gap-2 text-sm text-danger/80 hover:text-danger transition-colors font-mono tracking-wide"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-danger/60" />
              Contact Support
            </a>
          </div>

          {/* Right: accordion */}
          <div ref={accordionRef} className="space-y-0">
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item border-b border-white/[0.04]">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between py-7 text-left group"
                >
                  <span className={`text-base font-medium pr-8 transition-colors duration-300 ${open === i ? "text-white" : "text-primary/80 group-hover:text-white"}`}>
                    {faq.q}
                  </span>
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 ${
                    open === i
                      ? "border-danger/30 bg-danger/10 text-danger"
                      : "border-white/[0.06] text-dim group-hover:border-danger/20 group-hover:text-danger"
                  }`}>
                    {open === i ? (
                      <Minus className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>
                <div
                  ref={contentRefs.current[i]}
                  className="overflow-hidden"
                  style={{ display: i === 0 ? "block" : "none", height: i === 0 ? "auto" : 0 }}
                >
                  <p className="text-sm text-dim/80 leading-[1.8] pb-7 max-w-lg">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
