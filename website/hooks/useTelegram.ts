"use client";

import { useState, useCallback } from "react";

export function useTelegram() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const testTelegram = useCallback(async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch("/backend/api/telegram/test", { method: "POST" });
      const data = await res.json();
      setResult(data.ok ? "\u2713 Sent!" : "\u2717 Failed");
    } catch {
      setResult("\u2717 Backend offline");
    }
    setTesting(false);
    setTimeout(() => setResult(null), 3000);
  }, []);

  return { testing, result, testTelegram };
}
