"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Pencil } from "lucide-react";
import { projectsApi, skillsApi, studentsApi, assignmentsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import {
  ProjectWithSkills,
  Skill,
  User,
  Assignment,
  PROJECT_STATUS_LABELS,
} from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Progress";
import ProjectForm, { ProjectFormValues } from "@/components/project/ProjectForm";
import { SelectInput } from "@/components/ui/Field";

export default function AdminProjectDetail() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const project = useAsync<ProjectWithSkills>(() => projectsApi.get(projectId), [projectId]);
  const skills = useAsync<Skill[]>(() => skillsApi.list());
  const students = useAsync<User[]>(() => studentsApi.list());
  const assignments = useAsync<Assignment[]>(() => projectsApi.assignments(projectId), [projectId]);

  const [editing, setEditing] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toRedo, setToRedo] = useState<{ type: "skill" | "student"; id: string | null; assignmentId?: string } | null>(null);

  if (project.loading) return <LoadingState label="Loading project…" />;
  if (project.error) return <ErrorState message={project.error} retry={project.reload} />;
  if (!project.data) return null;

  const p = project.data;

  async function addSkill() {
    if (!selectedSkill) return;
    setBusy(true);
    try {
      await projectsApi.addSkill(projectId, selectedSkill);
      setSelectedSkill("");
      project.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add skill");
    } finally {
      setBusy(false);
    }
  }

  async function removeSkill(skillId: string) {
    setBusy(true);
    try {
      await projectsApi.removeSkill(projectId, skillId);
      project.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove skill");
    } finally {
      setBusy(false);
    }
  }

  async function assignStudent() {
    if (!selectedStudent) return;
    setBusy(true);
    setError(null);
    try {
      await projectsApi.assign(projectId, selectedStudent);
      setSelectedStudent("");
      assignments.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign student");
    } finally {
      setBusy(false);
    }
  }

  async function removeAssignment(assignmentId: string) {
    setBusy(true);
    try {
      await assignmentsApi.remove(assignmentId);
      assignments.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove assignment");
    } finally {
      setBusy(false);
    }
  }

  async function onEdit(values: ProjectFormValues) {
    await projectsApi.update(projectId, {
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
    setEditing(false);
    project.reload();
  }

  const assignedIds = new Set((assignments.data ?? []).map((a) => a.studentId));
  const availableSkills = (skills.data ?? []).filter(
    (s) => !(p.skills ?? []).some((ps) => ps.id === s.id),
  );
  const availableStudents = (students.data ?? []).filter((u) => !assignedIds.has(u.id));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/projects" className="text-sm text-ink-2 hover:text-brand-500">
        ← Back to projects
      </Link>

      {editing ? (
        <ProjectForm
          initial={p}
          submitLabel="Save changes"
          onSubmit={onEdit}
          busy={busy}
        />
      ) : (
        <>
          <Card>
            <CardHeader
              title={p.title}
              subtitle={`Created ${new Date(p.createdAt).toLocaleDateString()}`}
              action={
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} label={PROJECT_STATUS_LABELS[p.status]} />
                  <button
                    className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>
              }
            />
            <CardBody className="space-y-4">
              {p.description && <p className="text-sm text-ink">{p.description}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                {p.startDate && (
                  <p className="text-sm text-ink-2">
                    <span className="font-medium text-ink">Start:</span>{" "}
                    {new Date(p.startDate + "T00:00:00").toLocaleDateString()}
                  </p>
                )}
                {p.deadline && (
                  <p className="text-sm text-ink-2">
                    <span className="font-medium text-ink">Deadline:</span>{" "}
                    {new Date(p.deadline + "T00:00:00").toLocaleDateString()}
                  </p>
                )}
              </div>
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
        </>
      )}

      {error && <Alert kind="error">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Required skills" subtitle="Skills that will be evaluated for this project." />
          <CardBody className="space-y-3">
            {(p.skills ?? []).length === 0 ? (
              <EmptyState
                title="No skills yet"
                description="Add required skills so they can be evaluated for each student."
              />
            ) : (
              <ul className="space-y-2">
                {(p.skills ?? []).map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border border-edge-soft px-3 py-2">
                    <span className="text-sm font-medium text-ink">{s.name}</span>
                    <button
                      className="text-xs font-medium text-rose-500 hover:underline"
                      onClick={() => removeSkill(s.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 border-t border-edge-soft pt-3">
              <SelectInput
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
              >
                <option value="">Select skill...</option>
                {availableSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectInput>
              <button className="btn-secondary" onClick={addSkill} disabled={busy || !selectedSkill}>
                Add
              </button>
            </div>
            {availableSkills.length === 0 && (skills.data ?? []).length === 0 && (
              <p className="text-xs text-ink-3">
                No skills exist yet.{" "}
                <Link href="/admin/skills" className="text-brand-500 underline">
                  Create skills
                </Link>{" "}
                first.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Assign to students" subtitle="Each student gets their own assignment with evaluations." />
          <CardBody className="space-y-3">
            {(assignments.data ?? []).length === 0 ? (
              <EmptyState
                title="No students assigned"
                description="Assign this project to students so they can see it in their workspace."
              />
            ) : (
              <ul className="space-y-2">
                {(assignments.data ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg border border-edge-soft px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-ink">{a.student?.fullName}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <StatusBadge status={a.status} />
                        {a.hasSubmitted && <span className="text-xs text-emerald-500">submitted</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/corrections/${a.id}`}
                        className="text-xs font-medium text-brand-500 hover:underline"
                      >
                        Review
                      </Link>
                      <button
                        className="text-xs font-medium text-rose-500 hover:underline"
                        onClick={() => setToRedo({ type: "student", id: a.id })}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 border-t border-edge-soft pt-3">
              <SelectInput
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                <option value="">Select student...</option>
                {availableStudents.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </SelectInput>
              <button className="btn-secondary" onClick={assignStudent} disabled={busy || !selectedStudent}>
                Assign
              </button>
            </div>
            {availableStudents.length === 0 && (students.data ?? []).length === 0 && (
              <p className="text-xs text-ink-3">
                No students yet.{" "}
                <Link href="/admin/team" className="text-brand-500 underline">
                  Invite students
                </Link>{" "}
                to join the workspace.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={toRedo?.type === "student"}
        onClose={() => setToRedo(null)}
        onConfirm={() => {
          if (toRedo?.id) removeAssignment(toRedo.id);
          setToRedo(null);
        }}
        busy={busy}
        title="Remove student from project"
        message="This removes the assignment, submission and evaluations for this student on this project."
        confirmLabel="Remove assignment"
      />
    </div>
  );
}