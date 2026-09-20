"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { projectsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import { ProjectWithSkills, PROJECT_STATUS_LABELS, ProjectStatus } from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import StatusBadge from "@/components/ui/StatusBadge";
import { Card, PageHeader } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString();
}

const STATUS_OPTIONS = Object.entries(PROJECT_STATUS_LABELS) as [ProjectStatus, string][];

export default function AdminProjects() {
  const { data, error, loading, reload } = useAsync<ProjectWithSkills[]>(() =>
    projectsApi.list(),
  );
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [toDelete, setToDelete] = useState<ProjectWithSkills | null>(null);
  const [deleting, setDeleting] = useState(false);

  const projects = (data ?? []).filter(
    (p) => filter === "all" || p.status === filter,
  );

  async function changeStatus(p: ProjectWithSkills, status: ProjectStatus) {
    try {
      await projectsApi.setStatus(p.id, status);
      reload();
      toast.success(`"${p.title}" moved to ${PROJECT_STATUS_LABELS[status]}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await projectsApi.remove(toDelete.id);
      setToDelete(null);
      reload();
      toast.success("Project deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle="Create briefs, set skills, and manage assignments."
        action={
          <Link href="/admin/projects/new">
            <Button>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </Link>
        }
      />

      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          ...Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
        ]}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : projects.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "No projects yet" : "No projects in this status"}
          description="Create your first project brief to assign work to students."
          action={
            <Link href="/admin/projects/new">
              <Button>
                <Plus className="h-4 w-4" />
                New project
              </Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Deadline</th>
                <th>Skills</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="font-semibold text-ink transition hover:text-brand-500"
                    >
                      {p.title}
                    </Link>
                    <p className="line-clamp-1 max-w-md text-xs text-ink-3">{p.description}</p>
                  </td>
                  <td className="whitespace-nowrap text-ink-2">{formatDate(p.deadline)}</td>
                  <td>
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {(p.skills ?? []).slice(0, 3).map((s) => (
                        <span
                          key={s.id}
                          className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-ink-2"
                        >
                          {s.name}
                        </span>
                      ))}
                      {(p.skills ?? []).length > 3 && (
                        <span className="text-xs text-ink-3">+{(p.skills ?? []).length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} label={PROJECT_STATUS_LABELS[p.status]} />
                      <select
                        className="input !w-auto !py-1 !text-xs"
                        value={p.status}
                        aria-label={`Status for ${p.title}`}
                        onChange={(e) => changeStatus(p, e.target.value as ProjectStatus)}
                      >
                        {STATUS_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/projects/${p.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                        View
                      </Link>
                      <button
                        className="btn-ghost px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                        onClick={() => setToDelete(p)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
        title="Delete project"
        message={`Are you sure you want to delete "${toDelete?.title}"? All assignments, submissions and evaluations for this project will be removed.`}
        confirmLabel="Delete project"
      />
    </div>
  );
}