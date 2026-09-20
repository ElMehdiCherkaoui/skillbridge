import Link from "next/link";
import { CalendarDays, Folder } from "lucide-react";
import { ProjectWithSkills, PROJECT_STATUS_LABELS } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";

function formatDate(d?: string | null) {
  if (!d) return "No deadline";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ProjectCard({
  project,
  footer,
}: {
  project: ProjectWithSkills;
  footer?: React.ReactNode;
}) {
  const skills = project.skills ?? [];
  return (
    <div className="card flex flex-col">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-lg">
            <Folder className="h-5 w-5 text-brand-500" />
          </div>
          <StatusBadge status={project.status} label={PROJECT_STATUS_LABELS[project.status]} />
        </div>
        <h3 className="mt-3 text-base font-semibold leading-snug text-ink">
          {project.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-ink-2">{project.description}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 px-5 pb-3">
        {skills.slice(0, 4).map((s) => (
          <span
            key={s.id}
            className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2"
          >
            {s.name}
          </span>
        ))}
        {skills.length > 4 && (
          <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2">
            +{skills.length - 4}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-edge-soft px-5 py-3 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(project.deadline)}
        </span>
        {footer ?? (
          <Link href={`/admin/projects/${project.id}`} className="font-medium text-brand-500 hover:underline">
            View →
          </Link>
        )}
      </div>
    </div>
  );
}