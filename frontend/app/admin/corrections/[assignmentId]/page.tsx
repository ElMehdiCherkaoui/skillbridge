"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { assignmentsApi, evaluationsApi } from "@/services";
import { useAsync, ErrorState } from "@/hooks/useAsync";
import {
  Assignment,
  EvaluationInput,
  EvaluationView,
  Project,
  Submission,
  User,
  ASSIGNMENT_STATUS_LABELS,
} from "@/types";
import { LoadingState } from "@/components/ui/Spinner";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Progress";
import SkillEvaluationEditor from "@/components/skill/SkillEvaluationEditor";

type AssignmentDetailResponse = Assignment & {
  project?: Project;
  student?: User;
  submission?: Submission | null;
  evaluations?: EvaluationView[];
};

export default function CorrectionPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = params.assignmentId;

  const detail = useAsync<AssignmentDetailResponse>(() => assignmentsApi.get(assignmentId), [assignmentId]);
  const [drafts, setDrafts] = useState<Record<string, EvaluationInput>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const evaluations = useMemo(() => detail.data?.evaluations ?? [], [detail.data]);

  useEffect(() => {
    const next: Record<string, EvaluationInput> = {};
    for (const e of evaluations) {
      next[e.skillId] = {
        skillId: e.skillId,
        status: e.status,
        feedback: e.feedback,
        level1Validated: e.level1Validated,
        level2Validated: e.level2Validated,
        level3Validated: e.level3Validated,
      };
    }
    setDrafts(next);
  }, [evaluations]);

  if (detail.loading) return <LoadingState label="Loading assignment…" />;
  if (detail.error) return <ErrorState message={detail.error} retry={detail.reload} />;
  if (!detail.data) return null;

  const d = detail.data;
  const submission = d.submission;
  const draftList = evaluations.map((e) => drafts[e.skillId] ?? {
    skillId: e.skillId,
    status: "pending",
    feedback: "",
    level1Validated: false,
    level2Validated: false,
    level3Validated: false,
  });

  async function save(finalize: boolean) {
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      await evaluationsApi.save(assignmentId, draftList, finalize);
      setSuccess(finalize ? "Evaluation saved." : "Draft saved.");
      detail.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save evaluation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/corrections" className="text-sm text-ink-2 hover:text-brand-500">
          &larr; Back to corrections
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/students/${detail.data.studentId}`}
            className="text-sm text-ink-2 hover:text-brand-500"
          >
            Student profile
          </Link>
          <StatusBadge status={d.status} label={ASSIGNMENT_STATUS_LABELS[d.status as keyof typeof ASSIGNMENT_STATUS_LABELS] ?? d.status} />
        </div>
      </div>

      <Card>
        <CardHeader
          title={d.project?.title ?? "Project"}
          subtitle={`Student: ${d.student?.fullName ?? "—"}`}
        />
      </Card>

      <Card>
        <CardHeader
          title="Student Submission"
          action={
            submission?.submittedAt ? (
              <StatusBadge status="submitted" label={`Submitted ${new Date(submission.submittedAt).toLocaleDateString()}`} />
            ) : (
              <StatusBadge status="in_progress" label="Draft" />
            )
          }
        />
        <CardBody className="space-y-4">
          {!submission || (submission.links.length === 0 && !submission.description) ? (
            <EmptyState
              title="No submission yet"
              description="This student has not submitted any work yet."
            />
          ) : (
            <>
              {submission.links.length > 0 && (
                <ul className="space-y-2">
                  {submission.links.map((l, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
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
              {submission.description && (
                <p className="prose-sm-custom rounded-lg bg-surface-2 p-3 text-sm text-ink">
                  {submission.description}
                </p>
              )}
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Skills evaluation"
          subtitle="Validate or reject each required skill and add feedback."
        />
        <CardBody className="space-y-4">
          {evaluations.length === 0 ? (
            <EmptyState
              title="No skills to evaluate"
              description="Add required skills to this project so they can be evaluated."
            />
          ) : (
            draftList.map((draft) => {
              const evaluation = evaluations.find((e) => e.skillId === draft.skillId);
              if (!evaluation) return null;
              return (
                <SkillEvaluationEditor
                  key={evaluation.id}
                  evaluation={evaluation}
                  draft={draft}
                  onDraftChange={(updated) =>
                    setDrafts((prev) => ({ ...prev, [updated.skillId]: updated }))
                  }
                />
              );
            })
          )}
        </CardBody>
      </Card>

      {evaluations.length > 0 && (
        <div className="sticky bottom-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                {success && <Alert kind="success">{success}</Alert>}
                {error && <Alert kind="error">{error}</Alert>}
                <p className="text-xs text-ink-2">
                  Save evaluation and mark the assignment as reviewed (finalized).
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" disabled={saving} onClick={() => save(false)}>
                  Save draft
                </button>
                <button className="btn-primary" disabled={saving} onClick={() => save(true)}>
                  {saving ? "Saving…" : "Save Evaluation"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}