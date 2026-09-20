"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Clock, Flag, Folder, Hourglass, XCircle } from "lucide-react";
import { studentsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import { StudentProfile, Assignment, ASSIGNMENT_STATUS_LABELS } from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { Card, CardHeader, CardBody, StatCard } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/Progress";

export default function AdminStudentProfile() {
  const params = useParams<{ id: string }>();
  const profile = useAsync<StudentProfile>(() => studentsApi.profile(params.id), [params.id]);
  const assignments = useAsync<Assignment[]>(() => studentsApi.assignments(params.id), [params.id]);

  if (profile.loading) return <LoadingState label="Loading student…" />;
  if (profile.error) return <ErrorState message={profile.error} retry={profile.reload} />;
  if (!profile.data) return null;

  const s = profile.data;
  const totalSkills = s.stats.validatedSkills + s.stats.rejectedSkills + s.stats.pendingSkills;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/students" className="text-sm text-ink-2 hover:text-brand-500">
        &larr; Back to students
      </Link>

      <Card>
        <CardHeader
          title={s.fullName}
          subtitle={s.email}
          action={<StatusBadge status="student" label="Student" />}
        />
        <CardBody>
          <p className="text-sm text-ink-2">Registered on {new Date(s.createdAt).toLocaleDateString()}</p>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Projects" value={s.stats.totalProjects} icon={<Folder className="h-5 w-5" />} accent="brand" />
        <StatCard label="Completed projects" value={s.stats.completedProjects} icon={<Flag className="h-5 w-5" />} accent="emerald" />
        <StatCard label="In progress" value={s.stats.inProgressProjects} icon={<Clock className="h-5 w-5" />} accent="sky" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Validated skills" value={s.stats.validatedSkills} icon={<BadgeCheck className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Rejected skills" value={s.stats.rejectedSkills} icon={<XCircle className="h-5 w-5" />} accent="amber" />
        <StatCard label="Pending skills" value={s.stats.pendingSkills} icon={<Hourglass className="h-5 w-5" />} accent="violet" />
      </div>

      {totalSkills > 0 && (
        <Card>
          <CardHeader title="Overall skill progress" />
          <CardBody>
            <ProgressBar value={s.stats.validatedSkills} total={totalSkills} label="Validated skills" />
          </CardBody>
        </Card>
      )}

      <div>
        <h3 className="mb-3 text-lg font-semibold text-ink">Projects</h3>
        {assignments.loading ? (
          <LoadingState className="py-8" />
        ) : assignments.error ? (
          <ErrorState message={assignments.error} retry={assignments.reload} />
        ) : (assignments.data ?? []).length === 0 ? (
          <EmptyState
            title="No projects assigned"
            description="This student has not been assigned any project yet."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(assignments.data ?? []).map((a) => (
              <Card key={a.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{a.project?.title}</p>
                      <p className="mt-0.5 text-xs text-ink-2">
                        Deadline:{" "}
                        {a.project?.deadline
                          ? new Date(a.project.deadline + "T00:00:00").toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <StatusBadge status={a.status} label={ASSIGNMENT_STATUS_LABELS[a.status]} />
                  </div>
                  {typeof a.statsTotal === "number" && a.statsTotal > 0 && (
                    <div className="mt-3">
                      <ProgressBar value={a.statsValidated ?? 0} total={a.statsTotal} label="Progress" />
                    </div>
                  )}
                  <Link
                    href={`/admin/corrections/${a.id}`}
                    className="btn-secondary mt-3 w-full px-3 py-1.5 text-xs"
                  >
                    Open assignment
                  </Link>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}