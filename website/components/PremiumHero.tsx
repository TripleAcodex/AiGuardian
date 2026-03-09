"use client";

import { motion } from "framer-motion";

export default function PremiumHero() {
  return (
    <div className="relative w-full h-screen bg-[#020202] overflow-hidden flex items-center justify-center">
      {/* AI Threat Detection Video Background */}
      <div className="absolute inset-0 z-0 w-full h-full bg-[#020202]">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        {/* Dark overlays to maintain the 60% dark space rule and readability */}
        <div className="absolute inset-0 bg-[#020202]/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020202]/10 via-[#020202]/50 to-[#020202]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#020202_80%)]" />
      </div>

      {/* Deep Red Core Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF4B4B]/[0.08] rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Topographic grid with perspective (Tactical Feel) */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,75,75,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,75,75,0.03) 1px, transparent 1px)`,
          backgroundSize: '4rem 4rem',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 100%)',
          transform: 'perspective(100vh) rotateX(60deg) scale(2) translateY(-20%)',
          transformOrigin: 'top center'
        }}
      />

      {/* Hero Content */}
      <div className="relative z-10 text-center max-w-5xl px-6 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          {/* Badge */}
          <span className="inline-flex items-center gap-2 py-1.5 pr-4 pl-3 rounded-full bg-[#FF4B4B]/5 border border-[#FF4B4B]/30 text-white/80 font-mono text-[10px] sm:text-xs tracking-[0.2em] uppercase mb-8 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4B4B] shadow-[0_0_8px_rgba(255,75,75,0.8)] animate-pulse" />
            AI-POWERED THREAT DETECTION
          </span>
          
          {/* Headline - pure white as per screenshot for max contrast */}
          <h1 className="text-5xl sm:text-6xl md:text-[5.5rem] font-bold font-sans tracking-tighter text-white mb-6 leading-[1.05] drop-shadow-2xl max-w-4xl">
            People die because <br /> help arrives too late.
          </h1>
          
          {/* Subheadline - 30% rule (Muted secondary text) */}
          <p className="text-base md:text-lg font-sans font-medium text-white/50 max-w-2xl mx-auto leading-relaxed mb-10">
            AI Guardian uses two-stage AI: skeleton detection + graph neural network. 
            Violence confirmed in under one second.<br className="hidden md:block mt-2"/>
            No facial recognition. No stored footage. Just protection.
          </p>

          {/* Call to Actions (CTAs) - The 10% Accent Rule */}
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            {/* Primary CTA (High Contrast, 10% rule) */}
            <motion.a 
              href="#demo"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 bg-white text-black font-semibold rounded-lg flex items-center gap-2 transition-colors hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              Try Live Demo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-1">
                <path d="M12 4V20M12 20L6 14M12 20L18 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.a>
            
            {/* Secondary CTA (Ghost/Dark button) */}
            <motion.a 
              href="/dashboard"
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 bg-[#111111] border border-white/10 text-white font-semibold rounded-lg transition-all"
            >
              Enter Dashboard
            </motion.a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
