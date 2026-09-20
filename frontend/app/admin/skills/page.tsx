"use client";

import { FormEvent, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { skillsApi, projectsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import { Skill, ProjectWithSkills } from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { Card, CardHeader, CardBody, PageHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Progress";
import { TextInput } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function AdminSkills() {
  const skills = useAsync<Skill[]>(() => skillsApi.list());
  const projects = useAsync<ProjectWithSkills[]>(() => projectsApi.list());
  const toast = useToast();

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState(false);

  const skillNameToProjects = new Map<string, string[]>();
  for (const p of projects.data ?? []) {
    for (const s of p.skills ?? []) {
      const arr = skillNameToProjects.get(s.name) ?? [];
      arr.push(p.title);
      skillNameToProjects.set(s.name, arr);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await skillsApi.create(trimmed);
      setName("");
      skills.reload();
      toast.success(`Skill "${trimmed}" added`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create skill");
    } finally {
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await skillsApi.remove(toDelete.id);
      setToDelete(null);
      skills.reload();
      toast.success(`Skill "${toDelete.name}" removed`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete skill");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Skills"
        subtitle="The global skill catalog used in project briefs and evaluations."
      />

      <Card>
        <CardHeader title="Create a skill" subtitle="Add something like Python, Docker or Machine Learning." />
        <CardBody>
          {error && (
            <div className="mb-3">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
            <TextInput
              aria-label="Skill name"
              placeholder="e.g. Python, Docker, Machine Learning…"
              className="flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" loading={creating}>
              <Plus className="h-4 w-4" />
              {creating ? "Adding…" : "Add skill"}
            </Button>
          </form>
        </CardBody>
      </Card>

      {skills.loading ? (
        <LoadingState />
      ) : skills.error ? (
        <ErrorState message={skills.error} retry={skills.reload} />
      ) : (skills.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-9 w-9 text-brand-400" />}
          title="No skills yet"
          description="Create skills like Python, SQL or Git, then attach them to project briefs."
        />
      ) : (
        <Card>
          <CardHeader title={`Catalog (${(skills.data ?? []).length})`} />
          <ul className="divide-y divide-edge-soft">
            {(skills.data ?? []).map((s) => {
              const usedIn = skillNameToProjects.get(s.name) ?? [];
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500/15 to-violet-500/10 text-brand-500 dark:text-brand-400">
                      <Wrench className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{s.name}</p>
                      <p className="text-xs text-ink-3">
                        {usedIn.length > 0
                          ? `Used in ${usedIn.length} project${usedIn.length > 1 ? "s" : ""}`
                          : "Not used yet"}
                      </p>
                    </div>
                  </div>
                  <button
                    className="text-xs font-semibold text-rose-500 transition hover:underline dark:text-rose-400"
                    onClick={() => setToDelete(s)}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
        title={`Delete "${toDelete?.name}"?`}
        message="This removes the skill from the catalog. It will also be removed from all projects that use it."
        confirmLabel="Delete skill"
      />
    </div>
  );
}