"use client";

import { useState, useEffect, useCallback } from "react";

export interface CameraStatus {
  source: string;
  connected: boolean;
  resolution: string;
  camera_fps: number;
  type: string;
}

export function useCameraStream(pollInterval = 5000) {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCameraStatus = useCallback(async () => {
    try {
      const res = await fetch("/backend/api/camera/status");
      if (res.ok) {
        const data: CameraStatus = await res.json();
        setCameraStatus(data);
        setError(null);
      }
    } catch {
      setError("Backend offline");
    }
  }, []);

  useEffect(() => {
    fetchCameraStatus();
    const id = setInterval(fetchCameraStatus, pollInterval);
    return () => clearInterval(id);
  }, [fetchCameraStatus, pollInterval]);

  const connectCamera = useCallback(
    async (source: string) => {
      try {
        await fetch("/backend/api/camera", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source }),
        });
        setTimeout(fetchCameraStatus, 2500);
      } catch {
        /* backend offline */
      }
    },
    [fetchCameraStatus]
  );

  return { cameraStatus, connectCamera, error, refetchCamera: fetchCameraStatus };
}
