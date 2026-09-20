"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  FolderKanban,
  Plus,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { statsApi, assignmentsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import { DashboardStats, Assignment, ASSIGNMENT_STATUS_LABELS } from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { PageHeader, StatCard } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";

const quickLinks = [
  { href: "/admin/projects/new", label: "Create a project brief", icon: Plus, desc: "A new project for students" },
  { href: "/admin/projects", label: "Manage projects", icon: FolderKanban, desc: "Briefs, skills & assignments" },
  { href: "/admin/students", label: "Manage students", icon: Users, desc: "Profiles and progress" },
  { href: "/admin/team", label: "Invite people", icon: Sparkles, desc: "Send join invitations" },
];

export default function AdminDashboard() {
  const stats = useAsync<DashboardStats>(() => statsApi.dashboard());
  const pending = useAsync<Assignment[]>(() => assignmentsApi.list());

  if (stats.loading) return <LoadingState label="Loading dashboard…" />;
  if (stats.error) return <ErrorState message={stats.error} retry={stats.reload} />;

  const s = stats.data ?? {
    projects: 0,
    students: 0,
    assignments: 0,
    pendingCorrections: 0,
    validatedSkills: 0,
    completedProjects: 0,
  };

  const toReview = (pending.data ?? []).filter((a) =>
    ["submitted", "under_review"].includes(a.status),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your teaching workspace."
        action={
          <Link href="/admin/projects/new">
            <Button>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Projects" value={s.projects} icon={<FolderKanban className="h-5 w-5" />} accent="brand" />
        <StatCard label="Students" value={s.students} icon={<Users className="h-5 w-5" />} accent="sky" />
        <StatCard label="Assignments" value={s.assignments} icon={<ClipboardList className="h-5 w-5" />} accent="violet" />
        <StatCard
          label="Pending corrections"
          value={s.pendingCorrections}
          icon={<BadgeCheck className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard label="Validated skills" value={s.validatedSkills} icon={<Wrench className="h-5 w-5" />} accent="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-base font-semibold tracking-tight text-ink">Waiting for correction</h3>
            <Link href="/admin/corrections" className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:underline dark:text-brand-400">
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="card-body">
            {pending.loading ? (
              <LoadingState label="Loading…" className="py-8" />
            ) : pending.error ? (
              <ErrorState message={pending.error} retry={pending.reload} />
            ) : toReview.length === 0 ? (
              <EmptyState
                icon={<BadgeCheck className="h-9 w-9 text-emerald-400" />}
                title="Nothing to correct"
                description="When a student submits their work, it will show up here for you to validate skills."
              />
            ) : (
              <ul className="divide-y divide-edge-soft">
                {toReview.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{a.project?.title}</p>
                      <p className="text-xs text-ink-3">Student: {a.student?.fullName}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={a.status} label={ASSIGNMENT_STATUS_LABELS[a.status]} />
                      <Link
                        href={`/admin/corrections/${a.id}`}
                        className="btn-primary px-3 py-1.5 text-xs"
                      >
                        Review
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold tracking-tight text-ink">Quick actions</h3>
          </div>
          <div className="card-body space-y-3">
            {quickLinks.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group flex items-center justify-between rounded-xl border border-edge bg-surface px-4 py-3 text-sm transition hover:border-brand-500/40 hover:bg-brand-500/100/50/5"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500/15 to-violet-500/10 text-brand-500 dark:text-brand-400">
                    <q.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    <span className="block font-medium text-ink">{q.label}</span>
                    <span className="block text-xs text-ink-3">{q.desc}</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}