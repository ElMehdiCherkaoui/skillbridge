"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  ClipboardList,
  FolderKanban,
  Home,
  LayoutDashboard,
  Send,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Role } from "@/types";
import Logo from "@/components/ui/Logo";
import StatusBadge from "@/components/ui/StatusBadge";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/admin/corrections", label: "Corrections", icon: BadgeCheck },
  { href: "/admin/skills", label: "Skills", icon: Wrench },
  { href: "/admin/team", label: "Team & Invites", icon: Send },
];

const studentNav: NavItem[] = [
  { href: "/student/dashboard", label: "Workspace", icon: Home },
  { href: "/student/projects", label: "Projects", icon: FolderKanban },
];

export default function Sidebar({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = role === "admin" ? adminNav : studentNav;

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-edge bg-surface/60 backdrop-blur">
      <div className="flex h-16 items-center border-b border-edge-soft px-5">
        <Link
          href={role === "admin" ? "/admin/dashboard" : "/student/dashboard"}
          onClick={onNavigate}
        >
          <Logo size="sm" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          Menu
        </p>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-gradient-to-r from-brand-500/15 to-violet-500/10 text-brand-500 dark:text-brand-300 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]"
                  : "text-ink-2 hover:bg-surface-2/70 hover:text-ink"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-500 to-violet-500" />
              )}
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-edge-soft p-4">
        <div className="flex items-center justify-between rounded-xl border border-edge bg-surface-2/50 px-3 py-2.5">
          <StatusBadge status={role} label={role === "admin" ? "Teacher" : "Student"} />
          <Link
            href="/login"
            className="text-xs font-medium text-ink-3 transition hover:text-brand-500"
          >
            Switch
          </Link>
        </div>
      </div>
    </aside>
  );
}