"use client";

import { EvaluationInput, EvaluationView, SKILL_LEVEL_MAX } from "@/types";

export const LEVEL_META: { level: number; name: string; desc: string }[] = [
  { level: 1, name: "Level 1", desc: "Foundational" },
  { level: 2, name: "Level 2", desc: "Practical application" },
  { level: 3, name: "Level 3", desc: "Mastery" },
];

// Derived status keeps legacy semantics: validating any level marks the skill
// validated; clearing a previously validated skill marks it not validated;
// untouched pending skills stay pending.
function statusForLevels(l1: boolean, l2: boolean, l3: boolean, previous: EvaluationInput["status"]): EvaluationInput["status"] {
  if (l1 || l2 || l3) return "validated";
  if (previous === "validated") return "not_validated";
  return previous;
}

function pillClasses(on: boolean, mastered: boolean) {
  if (mastered) {
    return "border-emerald-400/60 bg-emerald-500/10 text-emerald-300";
  }
  if (on) {
    return "border-brand-500 bg-brand-500/10 text-brand-300";
  }
  return "border-edge bg-surface text-ink-3 hover:bg-surface-2";
}

export default function SkillEvaluationEditor({
  evaluation,
  draft,
  onDraftChange,
}: {
  evaluation: EvaluationView;
  draft: EvaluationInput;
  onDraftChange: (updated: EvaluationInput) => void;
}) {
  const levels = {
    level1Validated: draft.level1Validated ?? false,
    level2Validated: draft.level2Validated ?? false,
    level3Validated: draft.level3Validated ?? false,
  };
  const validatedLevel = levels.level3Validated ? 3 : levels.level2Validated ? 2 : levels.level1Validated ? 1 : 0;

  const toggleLevel = (level: number) => {
    let { level1Validated, level2Validated, level3Validated } = levels;
    const turnOn = level === 1 ? !level1Validated : level === 2 ? !level2Validated : !level3Validated;
    if (turnOn) {
      // Cumulative cascade: enabling a level fulfills every lower level.
      if (level >= 1) level1Validated = true;
      if (level >= 2) level2Validated = true;
      if (level >= 3) level3Validated = true;
    } else {
      // Clearing a level also clears the higher levels that depend on it.
      const target = level === 1 ? "level1Validated" : level === 2 ? "level2Validated" : "level3Validated";
      if (target === "level1Validated") {
        level1Validated = false;
        level2Validated = false;
        level3Validated = false;
      } else if (target === "level2Validated") {
        level2Validated = false;
        level3Validated = false;
      } else {
        level3Validated = false;
      }
    }
    const status = statusForLevels(level1Validated, level2Validated, level3Validated, draft.status);
    onDraftChange({ ...draft, level1Validated, level2Validated, level3Validated, status });
  };

  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink">{evaluation.skillName}</h4>
        <span className="text-xs font-medium text-ink-3">
          Validated level {validatedLevel}/{SKILL_LEVEL_MAX}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {LEVEL_META.map((meta) => {
          const on = meta.level === 1 ? levels.level1Validated : meta.level === 2 ? levels.level2Validated : levels.level3Validated;
          const mastered = meta.level === 3 && validatedLevel === 3;
          return (
            <button
              key={meta.level}
              type="button"
              aria-pressed={on}
              onClick={() => toggleLevel(meta.level)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${pillClasses(on, mastered)}`}
            >
              <span className="block text-xs font-semibold">{meta.name}</span>
              <span className="mt-0.5 block text-[11px] opacity-80">{meta.desc}</span>
            </button>
          );
        })}
      </div>

      <textarea
        className="mt-3 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        rows={2}
        placeholder="Add feedback for this skill..."
        aria-label={`Feedback for ${evaluation.skillName}`}
        value={draft.feedback}
        onChange={(e) => onDraftChange({ ...draft, feedback: e.target.value })}
      />
    </div>
  );
}