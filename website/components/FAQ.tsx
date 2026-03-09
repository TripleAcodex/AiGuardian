"use client";

import { useState, useRef, useEffect, useCallback, createRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";

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

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const accordionRef = useRef<HTMLDivElement>(null);

  // Create stable refs for content divs and icon divs
  const contentRefs = useRef<Array<React.RefObject<HTMLDivElement | null>>>(
    faqs.map(() => createRef<HTMLDivElement>())
  );
  const iconRefs = useRef<Array<React.RefObject<HTMLDivElement | null>>>(
    faqs.map(() => createRef<HTMLDivElement>())
  );

  // ScrollTrigger animations for initial reveal
  useGSAP(() => {
    // Left heading slide-in
    gsap.from(headingRef.current, {
      opacity: 0,
      x: -30,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: {
        trigger: headingRef.current,
        start: "top 85%",
        once: true,
      },
    });

    // FAQ items stagger reveal
    const faqItems = accordionRef.current?.querySelectorAll(".faq-item");
    if (faqItems?.length) {
      gsap.from(faqItems, {
        opacity: 0,
        y: 15,
        duration: 0.4,
        stagger: 0.05,
        ease: "power2.out",
        scrollTrigger: {
          trigger: accordionRef.current,
          start: "top 85%",
          once: true,
        },
      });
    }
  }, { scope: sectionRef });

  // Handle open/close animations with useEffect
  const prevOpen = useRef<number | null>(null);

  const animateOpen = useCallback((index: number) => {
    const content = contentRefs.current[index]?.current;
    const icon = iconRefs.current[index]?.current;
    if (!content) return;

    gsap.set(content, { display: "block" });
    gsap.fromTo(
      content,
      { height: 0, opacity: 0 },
      { height: "auto", opacity: 1, duration: 0.3, ease: "power2.out" }
    );
    if (icon) {
      gsap.to(icon, { rotation: 45, duration: 0.2 });
    }
  }, []);

  const animateClose = useCallback((index: number) => {
    const content = contentRefs.current[index]?.current;
    const icon = iconRefs.current[index]?.current;
    if (!content) return;

    gsap.to(content, {
      height: 0,
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => { gsap.set(content, { display: "none" }); },
    });
    if (icon) {
      gsap.to(icon, { rotation: 0, duration: 0.2 });
    }
  }, []);

  useEffect(() => {
    const prev = prevOpen.current;

    // Close previously open item
    if (prev !== null && prev !== open) {
      animateClose(prev);
    }

    // Open new item
    if (open !== null && open !== prev) {
      animateOpen(open);
    }

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
          {/* Left: heading -- stays visible */}
          <div ref={headingRef}>
            <span className="text-sm text-danger font-medium tracking-[0.2em] uppercase block mb-4">
              FAQ
            </span>
            <h2
              className="font-[var(--font-heading)] font-semibold text-primary tracking-[-0.03em] leading-[1.0] mb-6"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            >
              Common
              <br />
              questions.
            </h2>
            <p className="text-dim text-base leading-relaxed max-w-xs">
              Everything you need to know about AI Guardian.
              Can&rsquo;t find an answer? Reach out.
            </p>
          </div>

          {/* Right: accordion */}
          <div ref={accordionRef} className="space-y-0">
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item border-b border-border">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between py-6 text-left group"
                >
                  <span className="text-base font-medium text-primary pr-8 group-hover:text-white transition-colors">
                    {faq.q}
                  </span>
                  <div
                    ref={iconRefs.current[i]}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-dim group-hover:text-danger transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </button>
                <div
                  ref={contentRefs.current[i]}
                  className="overflow-hidden"
                  style={{ display: i === 0 ? "block" : "none", height: i === 0 ? "auto" : 0 }}
                >
                  <p className="text-sm text-dim leading-relaxed pb-6 max-w-lg">
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
