import Link from "next/link";
import { CalendarDays, Check, X } from "lucide-react";
import { Assignment, ASSIGNMENT_STATUS_LABELS } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/Progress";

function formatDate(d?: string | null) {
  if (!d) return "No deadline";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function AssignmentCard({
  assignment,
  href,
}: {
  assignment: Assignment;
  href: string;
}) {
  const project = assignment.project;
  const stats =
    assignment.evaluationStats ?? {
      total: assignment.statsTotal ?? 0,
      validated: assignment.statsValidated ?? 0,
      rejected: assignment.statsRejected ?? 0,
      pending: 0,
    };
  const total = stats.total;

  return (
    <Link href={href} className="card block transition-shadow hover:shadow-md">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-ink">
              {project?.title ?? "Project"}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-2">
              <CalendarDays className="h-3.5 w-3.5" />
              Deadline: {formatDate(project?.deadline)}
            </p>
          </div>
          <StatusBadge status={assignment.status} label={ASSIGNMENT_STATUS_LABELS[assignment.status]} />
        </div>

        {total > 0 && (
          <div className="mt-4">
            <ProgressBar
              value={stats.validated}
              total={total}
              label="Skills validated"
            />
            <div className="mt-2 flex items-center gap-3 text-xs text-ink-2">
              <span className="inline-flex items-center gap-1 text-emerald-500">
                <Check className="h-3.5 w-3.5" />
                {stats.validated} validated
              </span>
              <span className="inline-flex items-center gap-1 text-rose-600">
                <X className="h-3.5 w-3.5" />
                {stats.rejected} rejected
              </span>
              <span className="inline-flex items-center gap-1 text-amber-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {Math.max(0, total - stats.validated - stats.rejected)} pending
              </span>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}