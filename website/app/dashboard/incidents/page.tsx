"use client";

import { useState, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { AlertTriangle, Trash2, Image, Shield, Clock, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Incident {
  id: string;
  filename: string;
  timestamp: string;
  image_url: string;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [totalIncidents, setTotalIncidents] = useState(0);

  const container = useRef<HTMLDivElement>(null);

  const fetchIncidents = async () => {
    try {
      const res = await fetch("/backend/api/incidents");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setIncidents(data.incidents ?? []);
      setTotalIncidents(data.total ?? 0);
    } catch {
      setIncidents([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
    const id = setInterval(fetchIncidents, 10000);
    return () => clearInterval(id);
  }, []);

  useGSAP(() => {
    if (container.current && incidents.length > 0) {
      const cards = container.current.querySelectorAll(".incident-card");
      gsap.from(cards, {
        opacity: 0, y: 15, duration: 0.3, stagger: 0.04, ease: "power2.out",
      });
    }
  }, { scope: container, dependencies: [incidents.length] });

  const handleClear = async () => {
    if (!confirm("Clear all incidents? This cannot be undone.")) return;
    setClearing(true);
    try {
      await fetch("/backend/api/incidents/clear", { method: "POST" });
      setIncidents([]);
      setTotalIncidents(0);
    } catch {
      // Backend offline
    }
    setClearing(false);
  };

  const navigateLightbox = (dir: 1 | -1) => {
    if (selectedIndex === null) return;
    const next = selectedIndex + dir;
    if (next >= 0 && next < incidents.length) {
      setSelectedIndex(next);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "Escape") setSelectedIndex(null);
      if (e.key === "ArrowLeft") navigateLightbox(-1);
      if (e.key === "ArrowRight") navigateLightbox(1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, incidents.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-danger border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div ref={container}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-danger" />
            </div>
            <div>
              <h2 className="text-sm text-primary font-semibold">Incident Log</h2>
              <p className="text-[11px] text-muted mt-0.5">
                {totalIncidents} incident{totalIncidents !== 1 ? "s" : ""} recorded
              </p>
            </div>
          </div>
        </div>
        {incidents.length > 0 && (
          <button
            onClick={handleClear}
            disabled={clearing}
            className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-dim border border-white/[0.06] hover:text-danger hover:border-danger/30 hover:bg-danger/5 transition-all disabled:opacity-50 rounded-lg uppercase tracking-wider"
          >
            <Trash2 className="w-3 h-3" />
            {clearing ? "Clearing..." : "Clear All"}
          </button>
        )}
      </div>

      {incidents.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-surface/30 p-16 text-center">
          <AlertTriangle className="w-8 h-8 text-muted/40 mx-auto mb-3" />
          <p className="text-sm text-dim">No incidents recorded</p>
          <p className="text-[11px] text-muted mt-1">
            Incidents will appear here when violence is detected
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {incidents.map((inc, i) => (
            <div
              key={inc.id}
              className="incident-card group relative overflow-hidden rounded-xl border border-white/[0.06] bg-surface/30 hover:border-danger/20 hover:bg-surface/50 transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedIndex(i)}
            >
              {/* Image */}
              <div className="relative aspect-video bg-canvas overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/backend${inc.image_url}`}
                  alt={`Incident at ${inc.timestamp}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-7 h-7 rounded-md bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <Image className="w-3.5 h-3.5 text-white/80" />
                  </div>
                </div>
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-danger/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-danger/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-danger/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-danger/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-danger rounded-full" />
                  <span className="text-[10px] text-danger font-mono uppercase tracking-wider">
                    Violence Detected
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-muted" />
                  <p className="text-[11px] text-dim font-mono tabular-nums">
                    {inc.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Lightbox */}
      {selectedIndex !== null && incidents[selectedIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-dim hover:text-white hover:border-white/20 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Navigation */}
          {selectedIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-dim hover:text-white hover:border-white/20 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {selectedIndex < incidents.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-dim hover:text-white hover:border-white/20 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Image */}
          <div className="max-w-5xl mx-auto px-16" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/backend${incidents[selectedIndex].image_url}`}
              alt="Incident detail"
              className="max-w-full max-h-[75vh] object-contain rounded-lg mx-auto"
            />
            <div className="mt-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-danger rounded-full" />
                <span className="text-xs text-danger font-mono uppercase tracking-wider">Violence Detected</span>
              </div>
              <p className="text-xs text-dim font-mono tabular-nums">{incidents[selectedIndex].timestamp}</p>
              <p className="text-[10px] text-muted mt-1">{selectedIndex + 1} of {incidents.length} • Arrow keys to navigate • Esc to close</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
