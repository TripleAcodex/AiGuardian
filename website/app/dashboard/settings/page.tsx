"use client";

import { useState, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div>
        <div className="text-sm text-primary">{label}</div>
        <div className="text-sm text-dim mt-1">{description}</div>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    confidenceThreshold: 50,
    alertCooldown: 3,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"online" | "offline">("offline");
  const [uptime, setUptime] = useState(0);
  const [modelType, setModelType] = useState("\u2014");
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [botUsername, setBotUsername] = useState("");
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramResult, setTelegramResult] = useState<string | null>(null);

  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/backend/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings((prev) => ({
          ...prev,
          confidenceThreshold: Math.round((data.confidence_threshold ?? 0.5) * 100),
          alertCooldown: data.alert_cooldown ?? 3,
        }));
        setTelegramConnected(!!(data.telegram_token && data.telegram_chat_id));
      })
      .catch(() => {});

    fetch("/backend/api/telegram/info")
      .then((r) => r.json())
      .then((data) => {
        if (data.username) setBotUsername(data.username);
        if (data.connected) setTelegramConnected(true);
      })
      .catch(() => {});

    fetch("/backend/api/stats")
      .then((r) => r.json())
      .then((data) => {
        setBackendStatus("online");
        if (data.uptime) setUptime(data.uptime);
        if (data.model_type) setModelType(data.model_type);
      })
      .catch(() => setBackendStatus("offline"));
  }, []);

  useGSAP(() => {
    if (container.current) {
      const sections = container.current.querySelectorAll(".settings-section");
      gsap.from(sections, { opacity: 0, y: 20, duration: 0.3, stagger: 0.1, ease: "power2.out" });
    }
  }, { scope: container });

  const update = (key: string, value: unknown) => {
    setSettings((p) => ({ ...p, [key]: value }));
    setSaved(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/backend/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confidence_threshold: settings.confidenceThreshold / 100,
          alert_cooldown: settings.alertCooldown,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSaved(true);
    } catch {
      setSaveError("Backend offline \u2014 changes not saved");
    }
    setSaving(false);
  };

  const handleTestTelegram = async () => {
    setTelegramTesting(true);
    setTelegramResult(null);
    try {
      const res = await fetch("/backend/api/telegram/test", { method: "POST" });
      const data = await res.json();
      setTelegramResult(data.ok ? "\u2713 Sent!" : "\u2717 " + (data.message || "Failed"));
    } catch {
      setTelegramResult("\u2717 Backend offline");
    }
    setTelegramTesting(false);
    setTimeout(() => setTelegramResult(null), 4000);
  };

  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div ref={container} className="max-w-3xl space-y-8">
      {/* Detection Settings */}
      <div className="settings-section">
        <h3 className="text-sm text-danger uppercase tracking-[0.2em] mb-4 font-medium">
          Detection Engine
        </h3>
        <div className="bg-surface border border-border px-6 rounded-2xl">
          <SettingRow label="Confidence Threshold" description="Minimum confidence to trigger alert">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={30}
                max={95}
                value={settings.confidenceThreshold}
                onChange={(e) => update("confidenceThreshold", +e.target.value)}
                className="w-32 accent-[color:var(--color-danger)]"
              />
              <span className="text-sm text-primary font-mono tabular-nums w-10 text-right">
                {settings.confidenceThreshold}%
              </span>
            </div>
          </SettingRow>

          <SettingRow label="Alert Cooldown" description="Seconds between alerts">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={15}
                value={settings.alertCooldown}
                onChange={(e) => update("alertCooldown", +e.target.value)}
                className="w-32 accent-[color:var(--color-danger)]"
              />
              <span className="text-sm text-primary font-mono tabular-nums w-10 text-right">
                {settings.alertCooldown}s
              </span>
            </div>
          </SettingRow>
        </div>
      </div>

      {/* Telegram Notifications */}
      <div className="settings-section">
        <h3 className="text-sm text-danger uppercase tracking-[0.2em] mb-4 font-medium">
          Telegram Notifications
        </h3>
        <div className="bg-surface border border-border p-6 space-y-6 rounded-2xl">
          {/* Connection status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${telegramConnected ? "bg-safe" : "bg-dim"}`} />
              <span className={`text-sm ${telegramConnected ? "text-safe" : "text-dim"}`}>
                {telegramConnected ? "Connected" : "Not connected"}
              </span>
            </div>
            {telegramConnected && (
              <button
                onClick={handleTestTelegram}
                disabled={telegramTesting}
                className="px-4 py-2 text-sm border border-border text-dim hover:text-safe hover:border-safe/30 transition-all duration-300 disabled:opacity-50 rounded-xl flex items-center gap-2"
              >
                {telegramTesting && <div className="w-3 h-3 border border-dim border-t-transparent animate-spin rounded-full" />}
                {telegramResult ?? "Test"}
              </button>
            )}
          </div>

          {/* QR Code + Bot Link */}
          <div className="border-t border-border pt-6">
            <div className="flex items-start gap-8">
              {botUsername && (
                <div className="shrink-0 p-3 bg-white rounded-xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://t.me/${botUsername}&format=svg`}
                    alt="Telegram Bot QR"
                    width={120}
                    height={120}
                    className="block"
                  />
                </div>
              )}
              <div className="space-y-4 flex-1">
                <p className="text-sm text-dim leading-relaxed">
                  {telegramConnected
                    ? "Your Telegram is linked. You\u2019ll receive alerts when violence is detected."
                    : botUsername
                    ? "Scan the QR code or tap the button below to connect your Telegram account."
                    : "Configure the bot token in your server config to enable Telegram alerts."}
                </p>
                {botUsername && (
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-5 py-3 border border-border text-sm text-dim hover:text-primary hover:border-primary/30 transition-all duration-300 rounded-xl"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.484-.429-.008-1.252-.241-1.865-.44-.751-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.178.12.13.153.304.168.443.016.142.035.326.02.504z"/>
                    </svg>
                    Open Bot
                  </a>
                )}
                {!botUsername && !telegramConnected && (
                  <div className="p-4 border border-border bg-canvas rounded-xl">
                    <p className="text-sm text-dim leading-relaxed">
                      <span className="text-danger font-semibold">Setup:</span><br/>
                      1. Create a bot via <span className="text-primary font-mono">@BotFather</span> on Telegram<br/>
                      2. Add the bot token to your server config<br/>
                      3. Send <span className="text-primary font-mono">/start</span> to your bot to auto-connect
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="settings-section">
        <h3 className="text-sm text-danger uppercase tracking-[0.2em] mb-4 font-medium">
          System
        </h3>
        <div className="bg-surface border border-border p-6 rounded-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Version", value: "2.0.0" },
              { label: "Model", value: "YOLO11n-pose" },
              { label: "Classifier", value: modelType },
              { label: "Backend", value: backendStatus === "online" ? `Online (${formatUptime(uptime)})` : "Offline" },
            ].map((info) => (
              <div key={info.label}>
                <div className="text-sm text-dim uppercase tracking-[0.15em] mb-1">{info.label}</div>
                <div className={`text-sm font-mono ${info.label === "Backend" && backendStatus === "online" ? "text-safe" : info.label === "Backend" ? "text-danger" : "text-primary"}`}>{info.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-dim">
          {saveError ? (
            <span className="text-danger">{saveError}</span>
          ) : saved ? (
            <span className="text-safe">{"\u2713"} Saved</span>
          ) : (
            "Changes synced to detection engine"
          )}
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="shimmer-btn px-8 py-4 bg-danger text-white text-sm font-semibold tracking-wide uppercase hover:shadow-[0_0_30px_var(--color-danger-glow)] transition-all duration-300 disabled:opacity-50 rounded-2xl"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
