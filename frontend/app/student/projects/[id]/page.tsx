"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { projectsApi, assignmentsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import { ProjectWithSkills, Assignment } from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { SkillChip } from "@/components/skill/SkillValidation";

export default function StudentProjectBrief() {
  const params = useParams<{ id: string }>();
  const project = useAsync<ProjectWithSkills>(() => projectsApi.get(params.id), [params.id]);
  const assignments = useAsync<Assignment[]>(() => assignmentsApi.list());

  if (project.loading) return <LoadingState label="Loading brief…" />;
  if (project.error) return <ErrorState message={project.error} retry={project.reload} />;
  if (!project.data) return null;

  const p = project.data;
  const myAssignment = (assignments.data ?? []).find((a) => a.projectId === p.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/student/projects" className="text-sm text-ink-2 hover:text-brand-500">
        ← Back to projects
      </Link>

      <Card>
        <CardHeader
          title={p.title}
          subtitle={p.deadline ? `Deadline: ${new Date(p.deadline + "T00:00:00").toLocaleDateString()}` : "No deadline set"}
          action={
            myAssignment ? (
              <Link href={`/student/assignments/${myAssignment.id}`} className="btn-primary">
                {myAssignment.status === "submitted" || myAssignment.status === "under_review"
                  ? "View Status"
                  : "Submit Work"}
              </Link>
            ) : undefined
          }
        />
        <CardBody>
          {p.description && (
            <p className="prose-sm-custom text-base text-ink">{p.description}</p>
          )}
        </CardBody>
      </Card>

      {p.context && (
        <Card>
          <CardHeader title="Context" />
          <CardBody>
            <p className="prose-sm-custom">{p.context}</p>
          </CardBody>
        </Card>
      )}

      {p.cahierDesCharges && (
        <Card>
          <CardHeader title="Cahier des charges" />
          <CardBody>
            <p className="prose-sm-custom">{p.cahierDesCharges}</p>
          </CardBody>
        </Card>
      )}

      {p.objectives && (
        <Card>
          <CardHeader title="Objectives" />
          <CardBody>
            <ul className="space-y-2">
              {p.objectives
                .split("\n")
                .filter((l) => l.trim())
                .map((line, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-2">
                    <ChevronRight className="h-4 w-4 shrink-0 text-brand-500" />
                    <span>{line}</span>
                  </li>
                ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {(p.skills.length > 0 || (p.resources ?? []).length > 0) && (
        <Card>
          <CardHeader title="Resources & required skills" />
          <CardBody className="space-y-4">
            {p.skills.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Required skills</p>
                <div className="flex flex-wrap gap-2">
                  {p.skills.map((s) => (
                    <SkillChip key={s.id} name={s.name} />
                  ))}
                </div>
              </div>
            )}
            {p.resources.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Resources</p>
                <ul className="space-y-1">
                  {p.resources.map((res, i) => (
                    <li key={i} className="truncate text-sm text-brand-500">
                      {res}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {!myAssignment && (
        <p className="text-center text-sm text-ink-3">
          You are not assigned to this project yet.
        </p>
      )}
    </div>
  );
}