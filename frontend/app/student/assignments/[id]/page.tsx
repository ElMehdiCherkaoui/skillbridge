"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { assignmentsApi, submissionsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import {
  ASSIGNMENT_STATUS_LABELS,
  Assignment,
  EvaluationView,
  LinkType,
  Project,
  Submission,
  SUBMISSION_LINK_TYPES,
} from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import StatusBadge, { HumanizeStatus } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Progress";
import { TextArea, TextInput } from "@/components/ui/Field";
import { SkillValidationList } from "@/components/skill/SkillValidation";

type AssignmentDetailResponse = Assignment & {
  project?: Project;
  submission?: Submission | null;
  evaluations?: EvaluationView[];
};

type LinkMap = Record<LinkType, string>;

const emptyLinkMap: LinkMap = {
  github: "",
  figma: "",
  deployment: "",
  presentation: "",
  other: "",
};

export default function StudentAssignmentPage() {
  const params = useParams<{ id: string }>();
  const assignmentId = params.id;

  const detail = useAsync<AssignmentDetailResponse>(() => assignmentsApi.get(assignmentId), [assignmentId]);

  const [links, setLinks] = useState<LinkMap>(emptyLinkMap);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    const sub = detail.data?.submission;
    if (sub) {
      const map = { ...emptyLinkMap };
      for (const l of sub.links) {
        map[l.type] = l.url || "";
      }
      setLinks(map);
      setDescription(sub.description ?? "");
    }
  }, [detail.data]);

  if (detail.loading) return <LoadingState label="Loading assignment…" />;
  if (detail.error) return <ErrorState message={detail.error} retry={detail.reload} />;
  if (!detail.data) return null;

  const data = detail.data;
  const status = data.status;
  const submitted = Boolean(data.submission?.submittedAt);
  const isOpen = status === "assigned" || status === "in_progress" || status === "submitted";

  async function doSave(finalize: boolean) {
    setFormError(null);
    setFormSuccess(null);

    const linkList = SUBMISSION_LINK_TYPES.map((t) => ({
      type: t.value,
      url: links[t.value].trim(),
    })).filter((l) => l.url.length > 0);

    if (finalize && linkList.length === 0) {
      setFormError("Add at least one link before submitting your work.");
      return;
    }

    setSaving(true);
    try {
      await submissionsApi.save(assignmentId, {
        description,
        links: linkList,
        finalize,
      });
      setFormSuccess(finalize ? "Your work has been submitted!" : "Draft saved.");
      detail.reload();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save submission");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/student/dashboard" className="text-sm text-ink-2 hover:text-brand-500">
        ← Back to workspace
      </Link>

      <Card>
        <CardHeader
          title={data.project?.title ?? "Assignment"}
          subtitle={
            data.project?.deadline
              ? `Deadline: ${new Date(data.project.deadline + "T00:00:00").toLocaleDateString()}`
              : undefined
          }
          action={
            <StatusBadge status={status} label={ASSIGNMENT_STATUS_LABELS[status as keyof typeof ASSIGNMENT_STATUS_LABELS] ?? HumanizeStatus(status)} />
          }
        />
        <CardBody>
          {data.project && (
            <Link
              href={`/student/projects/${data.project.id}`}
              className="text-sm font-medium text-brand-500 hover:underline"
            >
              View full brief →
            </Link>
          )}
        </CardBody>
      </Card>

      {isOpen && (
        <Card>
          <CardHeader
            title="Submit your work"
            subtitle="Add the links to your GitHub repository, design, deployment and presentation, then describe what you did."
          />
          <CardBody className="space-y-4">
            {submitted && (
              <Alert kind="success">
                You have already submitted your work. You can update your links and description below.
              </Alert>
            )}

            {formError && <Alert kind="error">{formError}</Alert>}
            {formSuccess && <Alert kind="success">{formSuccess}</Alert>}

            <div className="grid gap-4 sm:grid-cols-2">
              {SUBMISSION_LINK_TYPES.map((t) => (
                <TextInput
                  key={t.value}
                  label={t.label}
                  placeholder="https://..."
                  value={links[t.value]}
                  onChange={(e) => setLinks((prev) => ({ ...prev, [t.value]: e.target.value }))}
                />
              ))}
            </div>

            <TextArea
              label="Description of your work"
              placeholder="Describe what you built, the approach you took, and anything the teacher should check."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="flex gap-3">
              <button
                className="btn-secondary"
                disabled={saving}
                onClick={() => doSave(false)}
              >
                Save draft
              </button>
              <button className="btn-primary" disabled={saving} onClick={() => doSave(true)}>
                {saving ? "Saving…" : submitted ? "Update submission" : "Submit work"}
              </button>
            </div>
          </CardBody>
        </Card>
      )}

      {data.submission && (
        <Card>
          <CardHeader
            title="Your submission"
            action={
              data.submission.submittedAt ? (
                <StatusBadge status="submitted" label="Submitted" />
              ) : (
                <StatusBadge status="in_progress" label="Draft" />
              )
            }
          />
          <CardBody className="space-y-4">
            {data.submission.links.length === 0 && data.submission.description === "" && !isOpen && (
              <EmptyState
                title="Nothing submitted yet"
                description="Open this assignment and add your links and description."
              />
            )}
            {data.submission.links.length > 0 && (
              <ul className="space-y-2">
                {data.submission.links.map((l, i) => (
                  <li key={l.id ?? i} className="flex items-center gap-2 text-sm">
                    <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium capitalize text-ink-2">
                      {l.type}
                    </span>
                    <a
                      href={l.url.startsWith("http") ? l.url : `https://${l.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-brand-500 hover:underline"
                    >
                      {l.url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {data.submission.description && (
              <p className="prose-sm-custom rounded-lg bg-surface-2 p-3 text-sm text-ink">
                {data.submission.description}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Skill validation"
          subtitle="The teacher evaluates each required skill for your project."
        />
        <CardBody>
          {data.evaluations && data.evaluations.length > 0 ? (
            <SkillValidationList items={data.evaluations} />
          ) : (
            <EmptyState title="No skills evaluated yet" description="Evaluations will appear here once the teacher reviews your work." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}