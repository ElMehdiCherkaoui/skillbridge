"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { projectsApi, assignmentsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import { ProjectWithSkills, Assignment } from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import ProjectCard from "@/components/project/ProjectCard";

export default function StudentProjects() {
  const projects = useAsync<ProjectWithSkills[]>(() => projectsApi.list());
  const assignments = useAsync<Assignment[]>(() => assignmentsApi.list());

  if (projects.loading || assignments.loading) return <LoadingState />;
  if (projects.error) return <ErrorState message={projects.error} retry={projects.reload} />;
  if (assignments.error) return <ErrorState message={assignments.error} retry={assignments.reload} />;

  const myProjectIds = new Set((assignments.data ?? []).map((a) => a.projectId));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">Projects</h2>
        <p className="mt-1 text-sm text-ink-2">
          Browse available briefs. Projects you&apos;re assigned to are marked.
        </p>
      </div>

      {projects.data && projects.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.data.map((p) => (
            <ProjectCard
              key={p.id}
              project={{
                ...p,
                status: (p.status === "published" ? "in_progress" : p.status) as ProjectWithSkills["status"],
              }}
              footer={
                <div className="flex items-center gap-2">
                  {myProjectIds.has(p.id) && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Assigned
                    </span>
                  )}
                  <Link
                    href={`/student/projects/${p.id}`}
                    className="font-medium text-brand-500 hover:underline"
                  >
                    View Brief →
                  </Link>
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No projects available"
          description="Published projects will appear here. Check back soon."
        />
      )}
    </div>
  );
}