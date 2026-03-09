"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { MouseEvent } from "react";

interface GlassCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function GlassCard({ title, description, icon }: GlassCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="group relative max-w-md rounded-2xl bg-[#020202] border border-white/[0.05] p-8 overflow-hidden backdrop-blur-xl transition-colors hover:border-[#FF4B4B]/30"
      style={{ boxShadow: "inset 0 1px 1px rgba(255,255,255,0.02)" }}
    >
      {/* Tactical red laser spotlight effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              300px circle at ${mouseX}px ${mouseY}px,
              rgba(255, 75, 75, 0.15),
              transparent 80%
            )
          `,
        }}
      />
      
      <div className="relative z-10 flex flex-col gap-4">
        <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-[#FF4B4B]/10 border border-[#FF4B4B]/20 text-[#FF4B4B]">
          {icon}
        </div>
        <h3 className="text-xl font-bold font-sans text-white/90 tracking-tight">{title}</h3>
        <p className="text-sm font-medium text-white/50 leading-relaxed font-sans">
          {description.replace(/\\u20{0,1}1[34]/g, "—")} 
        </p>
      </div>
    </div>
  );
}
