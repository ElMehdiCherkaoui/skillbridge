"use client";

import { useState } from "react";
import Link from "next/link";
import { assignmentsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import { Assignment, ASSIGNMENT_STATUS_LABELS } from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, PageHeader } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { SkillProgressBar } from "@/components/ui/Progress";
import { SegmentedControl } from "@/components/ui/Field";
import Avatar from "@/components/ui/Avatar";

const FILTERS = ["all", "assigned", "in_progress", "submitted", "under_review", "completed"];

export default function AdminAssignments() {
  const [filter, setFilter] = useState("all");
  const { data, error, loading, reload } = useAsync<Assignment[]>(() =>
    assignmentsApi.list(filter === "all" ? "" : filter),
  );

  const assignments = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        subtitle="Every project-student pairing with its skill progress."
      />

      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          ...Object.entries(ASSIGNMENT_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
        ]}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : assignments.length === 0 ? (
        <EmptyState
          title="No assignments"
          description="Assign a project to a student from the project page to create assignments."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Student</th>
                <th>Status</th>
                <th>Skill progress</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const total = a.statsTotal ?? 0;
                return (
                  <tr key={a.id}>
                    <td className="font-semibold text-ink">
                      {a.project?.title}
                      <p className="text-xs font-normal text-ink-3">
                        {a.project?.deadline
                          ? `Deadline ${new Date(a.project.deadline + "T00:00:00").toLocaleDateString()}`
                          : "No deadline"}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={a.student?.fullName ?? "?"} role="student" size="sm" />
                        <Link
                          href={`/admin/students/${a.studentId}`}
                          className="font-medium text-ink transition hover:text-brand-500"
                        >
                          {a.student?.fullName ?? "Student"}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={a.status} label={ASSIGNMENT_STATUS_LABELS[a.status]} />
                    </td>
                    <td className="min-w-[220px]">
                      {total > 0 ? (
                        <SkillProgressBar
                          validated={a.statsValidated ?? 0}
                          pending={a.evaluationStats?.pending ?? a.statsTotal! - (a.statsValidated ?? 0) - (a.statsRejected ?? 0)}
                          rejected={a.statsRejected ?? 0}
                          total={total}
                        />
                      ) : (
                        <span className="text-xs text-ink-3">No skills evaluated yet</span>
                      )}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/admin/corrections/${a.id}`}
                        className="btn-secondary px-3 py-1.5 text-xs"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}