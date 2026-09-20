"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { Project, PROJECT_STATUS_LABELS, ProjectStatus } from "@/types";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { TextInput, TextArea, SelectInput } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Progress";

export interface ProjectFormValues {
  title: string;
  description: string;
  context: string;
  cahierDesCharges: string;
  objectives: string;
  resources: string[];
  startDate: string;
  deadline: string;
  status: ProjectStatus;
}

const toFormValues = (p?: Partial<Project>): ProjectFormValues => ({
  title: p?.title ?? "",
  description: p?.description ?? "",
  context: p?.context ?? "",
  cahierDesCharges: p?.cahierDesCharges ?? "",
  objectives: p?.objectives ?? "",
  resources: p?.resources ?? [],
  startDate: p?.startDate ?? "",
  deadline: p?.deadline ?? "",
  status: p?.status ?? "draft",
});

export default function ProjectForm({
  initial,
  submitLabel,
  onSubmit,
  busy,
}: {
  initial?: Partial<Project>;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  busy?: boolean;
}) {
  const [values, setValues] = useState<ProjectFormValues>(() => toFormValues(initial));
  const [resources, setResources] = useState<string[]>(initial?.resources ?? []);
  const [resourceInput, setResourceInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function addResource() {
    const v = resourceInput.trim();
    if (!v) return;
    setResources((prev) => [...prev, v]);
    setResourceInput("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const final: ProjectFormValues = {
      ...values,
      title: values.title.trim(),
      resources,
    };
    if (!final.title) {
      setError("Title is required.");
      return;
    }
    if (final.deadline && final.startDate && final.deadline < final.startDate) {
      setError("Deadline cannot be before the start date.");
      return;
    }
    try {
      await onSubmit(final);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    }
  }

  return (
    <Card>
      <CardHeader
        title={submitLabel}
        subtitle="Fill in the brief. Publish it when you want students to see it."
      />
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert kind="error">{error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Title"
              required
              placeholder="e.g. MétéoRisk — Anticiper les perturbations logistiques"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
            />
            <SelectInput
              label="Status"
              value={values.status}
              onChange={(e) => set("status", e.target.value as ProjectStatus)}
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectInput>
          </div>

          <TextArea
            label="Description"
            placeholder="Short summary of what the project is about."
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
          />
          <TextArea
            label="Context"
            placeholder="Background and why this project matters."
            value={values.context}
            onChange={(e) => set("context", e.target.value)}
          />
          <TextArea
            label="Cahier des charges"
            placeholder="Detailed specification / requirements (one point per line)."
            value={values.cahierDesCharges}
            onChange={(e) => set("cahierDesCharges", e.target.value)}
          />
          <TextArea
            label="Objectives"
            placeholder="Learning and delivery objectives (one per line)."
            value={values.objectives}
            onChange={(e) => set("objectives", e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Start date"
              type="date"
              value={values.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
            <TextInput
              label="Deadline"
              type="date"
              value={values.deadline}
              onChange={(e) => set("deadline", e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="resource-input">
              Resources (optional)
            </label>
            <div className="flex gap-2">
              <input
                id="resource-input"
                className="input"
                placeholder="e.g. https://example.com/api-docs"
                value={resourceInput}
                onChange={(e) => setResourceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addResource();
                  }
                }}
              />
              <button type="button" className="btn-secondary" onClick={addResource}>
                Add
              </button>
            </div>
            {resources.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {resources.map((res, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink"
                  >
                    {res}
                    <button
                      type="button"
                      aria-label={`Remove resource ${res}`}
                      className="text-ink-3 hover:text-rose-500"
                      onClick={() => setResources((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => window.history.back()}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}