"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Shield, Video, AlertTriangle, Settings, Bell, User, BarChart3 } from "lucide-react";

const sidebarItems = [
  {
    label: "Command Center",
    href: "/dashboard",
    icon: <Video className="w-4 h-4" />,
    badge: null,
  },
  {
    label: "Incidents",
    href: "/dashboard/incidents",
    icon: <AlertTriangle className="w-4 h-4" />,
    badge: null,
  },
  {
    label: "Analytics",
    href: "/dashboard",
    icon: <BarChart3 className="w-4 h-4" />,
    badge: "Soon",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="w-4 h-4" />,
    badge: null,
  },
];

const navItems = [
  { label: "Cameras", href: "/dashboard", icon: <Video className="w-4 h-4" /> },
  { label: "Incidents", href: "/dashboard/incidents", icon: <AlertTriangle className="w-4 h-4" /> },
  { label: "Settings", href: "/dashboard/settings", icon: <Settings className="w-4 h-4" /> },
  { label: "Alerts", href: "/dashboard/incidents", icon: <Bell className="w-4 h-4" /> },
  { label: "Profile", href: "/dashboard/settings", icon: <User className="w-4 h-4" /> },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userName, setUserName] = useState("U");
  const [userFullName, setUserFullName] = useState("User");
  const [authed, setAuthed] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem("ag_auth");
    if (!raw) {
      router.push("/login");
      return;
    }
    try {
      const u = JSON.parse(raw);
      setUserName(u.name?.charAt(0)?.toUpperCase() || "U");
      setUserFullName(u.name || "User");
      setAuthed(true);
    } catch {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    document.body.classList.add("dashboard-active");
    return () => document.body.classList.remove("dashboard-active");
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("ag_auth");
    router.push("/login");
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-danger border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 h-full flex-col z-40 transition-all duration-300 ${
          sidebarCollapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {/* Sidebar background with subtle gradient */}
        <div className="absolute inset-0 bg-surface/60 backdrop-blur-2xl border-r border-white/[0.06]" />
        <div className="absolute inset-0 bg-gradient-to-b from-danger/[0.02] to-transparent pointer-events-none" />

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-[72px] z-50 w-6 h-6 bg-surface border border-white/10 rounded-full flex items-center justify-center text-dim hover:text-white hover:border-danger/40 hover:bg-danger/10 transition-all shadow-lg"
        >
          <svg
            className={`w-3 h-3 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Logo */}
        <Link
          href="/"
          className="relative h-16 flex items-center px-5 border-b border-white/[0.06] gap-3 hover:bg-white/[0.02] transition-colors group"
        >
          <div className="w-8 h-8 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center shrink-0 group-hover:bg-danger/20 group-hover:border-danger/40 transition-all">
            <Shield className="w-4 h-4 text-danger" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm text-primary font-semibold tracking-wide">AI Guardian</span>
              <span className="text-[10px] text-dim uppercase tracking-[0.2em]">Command Center</span>
            </div>
          )}
        </Link>

        {/* Navigation */}
        <nav className="relative flex-1 flex flex-col py-4 px-3 space-y-1">
          <div className={`text-[10px] text-muted uppercase tracking-[0.2em] mb-2 ${sidebarCollapsed ? "text-center" : "px-3"}`}>
            {sidebarCollapsed ? "•" : "Navigation"}
          </div>
          {sidebarItems.map((item) => {
            const active =
              item.href === "/dashboard" && item.label === "Command Center"
                ? pathname === "/dashboard"
                : item.href !== "/dashboard" && pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative flex items-center gap-3 px-3 py-2.5 text-[13px] tracking-wide transition-all duration-200 group rounded-xl ${
                  active
                    ? "text-danger bg-danger/[0.08] shadow-[inset_0_0_20px_rgba(200,30,30,0.05)]"
                    : item.badge
                      ? "text-muted cursor-default"
                      : "text-dim hover:text-primary hover:bg-white/[0.03]"
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-danger rounded-r-full" />
                )}
                <span className={`shrink-0 ${active ? "text-danger" : ""}`}>{item.icon}</span>
                {!sidebarCollapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {!sidebarCollapsed && item.badge && (
                  <span className="text-[9px] uppercase tracking-wider text-muted bg-white/[0.05] px-1.5 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer - user info */}
        {!sidebarCollapsed && (
          <div className="relative border-t border-white/[0.06] p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-elevated border border-white/10 flex items-center justify-center text-xs text-dim font-semibold uppercase">
                {userName}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary truncate">{userFullName}</p>
                <p className="text-[10px] text-muted">Operator</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main area ── */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"
        } pb-20 md:pb-0`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 bg-canvas/80 backdrop-blur-2xl border-b border-white/[0.06] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Mobile logo */}
            <div className="md:hidden w-7 h-7 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5 text-danger" />
            </div>
            <div>
              <h2 className="text-sm text-primary font-medium tracking-wide">
                {pathname === "/dashboard"
                  ? "Command Center"
                  : pathname.includes("incidents")
                  ? "Incident Log"
                  : "Settings"}
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-safe"></span>
              </span>
              <span className="text-[11px] text-safe font-mono tracking-wider uppercase">
                System Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-primary font-mono tabular-nums leading-tight">{time}</span>
              <span className="text-[10px] text-muted font-mono">{date}</span>
            </div>

            <div className="w-px h-6 bg-white/[0.06] hidden sm:block" />

            {/* Account dropdown */}
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="w-8 h-8 bg-elevated border border-white/10 rounded-lg flex items-center justify-center text-xs text-dim font-semibold uppercase hover:border-danger/30 hover:text-primary transition-all cursor-pointer"
              >
                {userName}
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-surface/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl shadow-black/30 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-xs text-primary font-medium">{userFullName}</p>
                    <p className="text-[10px] text-muted mt-0.5">Operator</p>
                  </div>
                  <Link
                    href="/"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-dim hover:text-primary hover:bg-white/[0.03] transition-colors"
                    onClick={() => setShowAccountMenu(false)}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    Home
                  </Link>
                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-dim hover:text-danger hover:bg-danger/5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-5 lg:p-6">{children}</main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-2xl border-t border-white/[0.06]">
        <div className="flex">
          {navItems.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`w-1/5 flex flex-col items-center gap-1 py-3 transition-colors relative ${
                  active ? "text-danger" : "text-dim"
                }`}
              >
                {active && (
                  <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-danger rounded-full" />
                )}
                {item.icon}
                <span className="text-[10px] leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
