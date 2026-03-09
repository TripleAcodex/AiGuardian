"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts";
import type { DetectionHistoryPoint } from "@/hooks/useDetections";
import { Activity } from "lucide-react";

interface DetectionChartProps {
  history: DetectionHistoryPoint[];
  threshold?: number;
}

/* Custom Tooltip */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-2 shadow-2xl shadow-black/30">
      <p className="text-[10px] text-muted font-mono mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${p.dataKey === "confidence" ? "bg-danger" : "bg-safe"}`} />
          <span className="text-[10px] text-dim capitalize">{p.dataKey}:</span>
          <span className="text-[10px] text-primary font-mono font-medium">
            {p.dataKey === "confidence" ? `${p.value}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DetectionChart({
  history,
  threshold = 0.5,
}: DetectionChartProps) {
  if (history.length < 2) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-surface/30 backdrop-blur-sm p-8 flex flex-col items-center justify-center">
        <Activity className="w-5 h-5 text-muted mb-2" />
        <p className="text-[11px] text-muted font-mono">Collecting data...</p>
        <p className="text-[10px] text-muted/60 mt-1">Chart will appear after 2+ data points</p>
      </div>
    );
  }

  const data = history.map((p) => ({
    time: p.time,
    confidence: Math.round(p.confidence * 100),
    people: p.people,
  }));

  // Find max violence point for emphasis
  const maxConf = Math.max(...data.map(d => d.confidence));
  const hasViolence = data.some(d => d.confidence > threshold * 100);

  return (
    <div className={`rounded-xl border bg-surface/30 backdrop-blur-sm overflow-hidden transition-all duration-500 ${
      hasViolence ? "border-danger/20" : "border-white/[0.06]"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-muted" />
          <h3 className="text-[11px] text-muted uppercase tracking-[0.15em] font-medium">
            Detection Timeline
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-px bg-danger" />
            <span className="text-[10px] text-muted">Confidence</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-px bg-safe" />
            <span className="text-[10px] text-muted">People</span>
          </div>
          {hasViolence && (
            <span className="text-[9px] text-danger font-mono uppercase tracking-wider px-1.5 py-0.5 bg-danger/10 border border-danger/20 rounded">
              Peak {maxConf}%
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-danger)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--color-danger)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="peopleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-safe)" stopOpacity={0.1} />
                <stop offset="100%" stopColor="var(--color-safe)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(255,255,255,0.03)"
              strokeDasharray="0"
              horizontal
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: "var(--color-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
              tickLine={false}
              minTickGap={48}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: "var(--color-muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={threshold * 100}
              stroke="var(--color-danger)"
              strokeDasharray="3 3"
              strokeOpacity={0.4}
              label={{ value: "Threshold", position: "insideRight", fill: "var(--color-danger)", fontSize: 9, fontFamily: "var(--font-mono)" }}
            />
            <Area
              type="monotone"
              dataKey="confidence"
              stroke="var(--color-danger)"
              fill="url(#confGrad)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: "var(--color-danger)" }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="people"
              stroke="var(--color-safe)"
              fill="url(#peopleGrad)"
              strokeWidth={1}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: "var(--color-safe)" }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
