"use client";

import { useState, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import LiquidGlass from "@/components/LiquidGlass";

export default function LoginPage() {
  const router = useRouter();

  const cardRef = useRef<HTMLDivElement>(null);
  const loginFormRef = useRef<HTMLFormElement>(null);
  const registerFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    document.body.classList.add("dashboard-active");
    return () => document.body.classList.remove("dashboard-active");
  }, []);

  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useGSAP(() => {
    gsap.from(cardRef.current, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      ease: "power2.out",
    });
  });

  useEffect(() => {
    if (registerFormRef.current) {
      gsap.set(registerFormRef.current, { display: "none", opacity: 0 });
    }
  }, []);

  useEffect(() => {
    const active = tab === "login" ? loginFormRef.current : registerFormRef.current;
    const inactive = tab === "login" ? registerFormRef.current : loginFormRef.current;
    if (!active || !inactive) return;

    gsap.to(inactive, {
      opacity: 0,
      x: tab === "login" ? 20 : -20,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        gsap.set(inactive, { display: "none" });
        gsap.set(active, { display: "block", opacity: 0, x: tab === "login" ? -20 : 20 });
        gsap.to(active, { opacity: 1, x: 0, duration: 0.25, ease: "power2.out" });
      },
    });
  }, [tab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
      } else {
        localStorage.setItem("ag_auth", JSON.stringify(data.user));
        router.push("/dashboard");
      }
    } catch {
      setError("Connection error. Try again.");
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, org }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
      } else {
        setSuccess("Account created! Signing in...");
        localStorage.setItem("ag_auth", JSON.stringify(data.user));
        setTimeout(() => router.push("/dashboard"), 800);
      }
    } catch {
      setError("Connection error. Try again.");
    }
    setLoading(false);
  };

  const switchTab = (t: "login" | "register") => {
    setTab(t);
    setError("");
    setSuccess("");
  };

  const inputCls = "w-full px-4 py-4 bg-surface border border-border text-primary text-sm placeholder:text-muted outline-none focus:border-danger/50 transition-all duration-300 rounded-2xl";

  return (
    <div className="min-h-screen bg-canvas flex relative overflow-hidden">
      {/* Perspective grid background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[80%]"
          style={{ perspective: "600px", perspectiveOrigin: "50% 0%" }}
        >
          <div
            className="w-full h-full origin-top"
            style={{
              transform: "rotateX(55deg)",
              backgroundImage:
                "linear-gradient(oklch(65% 0.15 25 / 0.12) 1px, transparent 1px), linear-gradient(90deg, oklch(65% 0.15 25 / 0.12) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
              maskImage:
                "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.05) 70%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.05) 70%, transparent 100%)",
            }}
          />
        </div>
      </div>

      {/* Red glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-danger rounded-full blur-[250px] opacity-[0.06] pointer-events-none" />

      {/* Login/Register card */}
      <div className="m-auto relative z-10 w-full max-w-md px-6">
        <div ref={cardRef} className="relative">
          <LiquidGlass intensity={3} speed={6} />
          {/* Logo */}
          <a href="/" className="flex items-center gap-4 mb-8 group">
            <div className="w-8 h-8 border border-danger rounded-2xl flex items-center justify-center transition-colors group-hover:bg-danger/10">
              <div className="w-4 h-4 bg-danger" />
            </div>
            <span className="text-primary font-medium text-sm tracking-[0.1em] uppercase font-[var(--font-heading)]">
              AI Guardian
            </span>
          </a>

          {/* Tabs */}
          <div className="flex gap-0 mb-8 border-b border-border">
            <button
              onClick={() => switchTab("login")}
              className={`px-6 py-4 text-sm tracking-wide uppercase transition-all duration-300 border-b-2 -mb-px ${
                tab === "login"
                  ? "text-primary border-danger"
                  : "text-dim border-transparent hover:text-primary"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchTab("register")}
              className={`px-6 py-4 text-sm tracking-wide uppercase transition-all duration-300 border-b-2 -mb-px ${
                tab === "register"
                  ? "text-primary border-danger"
                  : "text-dim border-transparent hover:text-primary"
              }`}
            >
              Register
            </button>
          </div>

          {/* Login form */}
          <form
            ref={loginFormRef}
            onSubmit={handleLogin}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm text-dim uppercase tracking-[0.15em] mb-4">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@company.com"
                required
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm text-dim uppercase tracking-[0.15em] mb-4">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className={inputCls}
              />
            </div>

            {error && tab === "login" && <p className="text-danger text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="shimmer-btn w-full py-4 bg-danger text-white text-sm font-semibold tracking-wide uppercase transition-all duration-300 hover:shadow-[0_0_40px_var(--color-danger-glow)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 rounded-2xl"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register form */}
          <form
            ref={registerFormRef}
            onSubmit={handleRegister}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm text-dim uppercase tracking-[0.15em] mb-4">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                required
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm text-dim uppercase tracking-[0.15em] mb-4">
                Organization
              </label>
              <input
                type="text"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                placeholder="Company / School / City"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm text-dim uppercase tracking-[0.15em] mb-4">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@company.com"
                required
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm text-dim uppercase tracking-[0.15em] mb-4">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                className={inputCls}
              />
            </div>

            {error && tab === "register" && <p className="text-danger text-sm">{error}</p>}
            {success && <p className="text-safe text-sm">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="shimmer-btn w-full py-4 bg-danger text-white text-sm font-semibold tracking-wide uppercase transition-all duration-300 hover:shadow-[0_0_40px_var(--color-danger-glow)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 rounded-2xl"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Register
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <div className="mt-8">
            <a href="/" className="text-sm text-dim hover:text-primary transition-colors">
              &larr; Back to site
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
