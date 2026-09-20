"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, LogOut, Moon, Sun, ChevronDown, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Avatar from "@/components/ui/Avatar";

export default function Navbar({
  title,
  subtitle,
  onMenuClick,
}: {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-edge bg-canvas/85 px-4 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-2 transition hover:bg-surface-2 hover:text-ink md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight text-ink md:text-lg">
            {title}
          </h1>
          {subtitle && <p className="hidden truncate text-xs text-ink-3 md:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-2 transition hover:bg-surface-2 hover:text-ink"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-2 py-1.5 transition hover:bg-surface-2"
          >
            <Avatar name={user?.fullName ?? "?"} role={user?.role ?? "student"} size="sm" />
            <span className="hidden max-w-40 truncate text-sm font-medium text-ink sm:block">
              {user?.fullName}
            </span>
            <ChevronDown className="h-4 w-4 text-ink-3" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-2xl border border-edge bg-surface shadow-card-lg animate-scale-in"
            >
              <div className="border-b border-edge-soft px-4 py-3">
                <p className="truncate text-sm font-semibold text-ink">{user?.fullName}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-3">
                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </p>
              </div>
              <button
                role="menuitem"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}