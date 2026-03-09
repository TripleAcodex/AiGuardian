"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface BackendStats {
  is_violence: boolean;
  confidence: number;
  person_count: number;
  people_count?: number;
  fps: number;
  total_incidents: number;
  reason: string;
  threshold: number;
  lstm_available: boolean;
  uptime?: number;
  model_type?: string;
  lstm_score?: number;
  motion_speed?: number;
}

export interface DetectionHistoryPoint {
  time: string;
  confidence: number;
  people: number;
  isViolence: boolean;
}

const MAX_HISTORY = 50;

export function useDetections(pollInterval = 2000) {
  const [stats, setStats] = useState<BackendStats | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<DetectionHistoryPoint[]>([]);
  const historyRef = useRef<DetectionHistoryPoint[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/backend/api/stats");
      if (res.ok) {
        const data: BackendStats = await res.json();
        setStats(data);
        setConnected(true);
        setError(null);

        const point: DetectionHistoryPoint = {
          time: new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          confidence: data.confidence,
          people: data.person_count ?? data.people_count ?? 0,
          isViolence: data.is_violence,
        };

        const next = [...historyRef.current, point].slice(-MAX_HISTORY);
        historyRef.current = next;
        setHistory(next);
      } else {
        setConnected(false);
      }
    } catch {
      setConnected(false);
      setError("Backend offline");
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, pollInterval);
    return () => clearInterval(id);
  }, [fetchStats, pollInterval]);

  return { stats, connected, history, error, refetch: fetchStats };
}
