"use client";

import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { assignmentsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import { Assignment } from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardHeader } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";

export default function AdminCorrections() {
  const { data, error, loading, reload } = useAsync<Assignment[]>(() =>
    assignmentsApi.list(),
  );

  const all = data ?? [];
  const toReview = all.filter((a) => ["submitted", "under_review", "completed"].includes(a.status));
  const noSubmission = all.filter((a) => !a.hasSubmitted && a.status !== "completed");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">Corrections</h2>
        <p className="mt-1 text-sm text-ink-2">
          Review student submissions and validate their skills.
        </p>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : toReview.length === 0 ? (
        <EmptyState
          icon={<PartyPopper className="h-10 w-10 text-ink-3" />}
          title="No corrections to review"
          description="When students submit their work, their assignments will appear here for skill validation."
        />
      ) : (
        <Card>
          <CardHeader
            title={`Submissions to review (${toReview.length})`}
            subtitle="Open an assignment to evaluate each skill and add feedback."
          />
          <ul className="divide-y divide-edge-soft">
            {toReview.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {a.project?.title}
                  </p>
                  <p className="text-xs text-ink-2">
                    Student: {a.student?.fullName}
                    {a.statsTotal
                      ? ` · ${a.statsValidated}/${a.statsTotal} skills validated`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={a.status} />
                  <Link href={`/admin/corrections/${a.id}`} className="btn-primary px-3 py-1.5 text-xs">
                    Review
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {noSubmission.length > 0 && (
        <Card>
          <CardHeader title="Waiting for submission" subtitle="Students have not submitted these yet." />
          <ul className="divide-y divide-edge-soft">
            {noSubmission.slice(0, 10).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{a.project?.title}</p>
                  <p className="text-xs text-ink-2">Student: {a.student?.fullName}</p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}