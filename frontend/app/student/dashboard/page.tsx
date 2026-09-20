"use client";

import Link from "next/link";
import { CalendarDays, Check, ClipboardList } from "lucide-react";
import { assignmentsApi, studentsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import { useAuth } from "@/context/AuthContext";
import { Assignment, ASSIGNMENT_STATUS_LABELS, StudentSkillMatrix } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Progress";
import { AssignmentCard } from "@/components/assignment/AssignmentCard";
import { LevelIndicator } from "@/components/skill/SkillValidation";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync<Assignment[]>(() =>
    assignmentsApi.list(),
  );
  const matrix = useAsync<StudentSkillMatrix | null>(
    () => (user?.id ? studentsApi.skills(user.id) : Promise.resolve(null)),
    [user?.id],
  );

  if (loading) return <LoadingState label="Loading your workspace…" />;
  if (error) return <ErrorState message={error} retry={reload} />;

  const assignments = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">My Workspace</h2>
        <p className="mt-1 text-sm text-ink-2">
          Your assigned projects, deadlines and progress at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assignments.map((a) => (
          <div key={a.id} className="card flex flex-col">
            <div className="flex-1 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-lg">
                  <ClipboardList className="h-5 w-5 text-brand-500" />
                </div>
                <StatusBadge
                  status={a.status}
                  label={ASSIGNMENT_STATUS_LABELS[a.status]}
                />
              </div>
              <h3 className="mt-3 font-semibold leading-snug text-ink">
                {a.project?.title}
              </h3>
              {a.project?.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-ink-2">
                  {a.project.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Deadline:{" "}
                  <span className="font-medium text-ink">
                    {a.project?.deadline
                      ? new Date(a.project.deadline + "T00:00:00").toLocaleDateString()
                      : "—"}
                  </span>
                </span>
              </div>
              {typeof a.statsTotal === "number" && a.statsTotal > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-ink-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  {a.statsValidated}/{a.statsTotal} skills validated
                </div>
              )}
            </div>
            <div className="flex gap-2 border-t border-edge-soft px-5 py-3">
              <Link
                href={`/student/projects/${a.projectId}`}
                className="btn-secondary flex-1"
              >
                View Brief
              </Link>
              <Link
                href={`/student/assignments/${a.id}`}
                className="btn-primary flex-1"
              >
                {a.status === "submitted" || a.status === "under_review"
                  ? "View Status"
                  : "Submit Work"}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {assignments.length === 0 && (
        <EmptyState
          title="No projects assigned yet"
          description="When a teacher assigns a project to you, it will appear here with its brief, deadline and required skills."
        />
      )}

      {matrix.data && matrix.data.stats.totalSkills > 0 && (
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-ink">My Skill Matrix</h3>
              <p className="mt-1 text-sm text-ink-2">
                Levels progress across all skills. Validating level 3 means mastery.
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-ink">{matrix.data.stats.overallProgressPercent}%</p>
                <p className="text-xs text-ink-2">overall</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-ink">{matrix.data.stats.level3}</p>
                <p className="text-xs text-ink-2">mastered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-ink">{matrix.data.stats.level1}</p>
                <p className="text-xs text-ink-2">level 1</p>
              </div>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
              style={{ width: `${Math.min(100, matrix.data.stats.overallProgressPercent)}%` }}
            />
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {matrix.data.skills.map((s) => (
              <li key={s.skillId} className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-surface px-3 py-2">
                <span className="truncate text-sm font-medium text-ink">{s.skillName}</span>
                <LevelIndicator
                  levels={[s.level1Validated, s.level2Validated, s.level3Validated]}
                  validatedLevel={s.validatedLevel}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        <h3 className="mb-3 text-lg font-semibold text-ink">All my assignments</h3>
        {assignments.length === 0 ? (
          <Alert kind="info">You have no assignments yet.</Alert>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {assignments.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                href={`/student/assignments/${a.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}