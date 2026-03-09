"use client";

import { motion } from "framer-motion";

interface LiveIndicatorProps {
  status: "idle" | "detecting" | "danger";
}

export default function LiveIndicator({ status }: LiveIndicatorProps) {
  const colors = {
    idle: "bg-white/40",
    detecting: "bg-emerald-500",
    danger: "bg-red-500",
  };

  const glows = {
    idle: "shadow-none",
    detecting: "shadow-[0_0_12px_rgba(16,185,129,0.6)]",
    danger: "shadow-[0_0_12px_rgba(239,68,68,0.8)]",
  };

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.05] w-fit">
      <div className="relative flex items-center justify-center w-3 h-3">
        {/* Outer glowing pulse */}
        {status !== "idle" && (
          <motion.div
            className={`absolute inset-0 rounded-full ${colors[status]} opacity-50`}
            animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {/* Inner dot */}
        <div className={`relative z-10 w-2 h-2 rounded-full ${colors[status]} ${glows[status]}`} />
      </div>
      <span className="text-xs font-mono text-white/70 uppercase tracking-widest">
        {status === "idle" ? "Standby" : status === "detecting" ? "Live Feed" : "Alert"}
      </span>
    </div>
  );
}
