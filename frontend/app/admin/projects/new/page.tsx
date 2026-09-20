"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { projectsApi } from "@/services";
import ProjectForm, { ProjectFormValues } from "@/components/project/ProjectForm";

export default function NewProjectPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(values: ProjectFormValues) {
    setBusy(true);
    try {
      const created = await projectsApi.create({
        title: values.title,
        description: values.description,
        context: values.context,
        cahierDesCharges: values.cahierDesCharges,
        objectives: values.objectives,
        resources: values.resources,
        startDate: values.startDate || null,
        deadline: values.deadline || null,
        status: values.status,
      });
      router.push(`/admin/projects/${created.id}`);
    } catch (e) {
      setBusy(false);
      throw e;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/projects" className="text-sm text-ink-2 hover:text-brand-500">
        &larr; Back to projects
      </Link>
      <div>
        <h2 className="text-xl font-bold text-ink">New project brief</h2>
        <p className="mt-1 text-sm text-ink-2">
          Define the brief, then add required skills and assign students.
        </p>
      </div>
      <ProjectForm submitLabel="Create project" onSubmit={onSubmit} busy={busy} />
    </div>
  );
}