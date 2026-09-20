import { EVALUATION_STATUS_LABELS, EvaluationStatus, EvaluationView } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";

// [L1][L2][L3] stage indicator: gray = not achieved, accent = validated,
// green = mastered (full cascade to level 3).
export function LevelIndicator({ levels, validatedLevel }: { levels: [boolean, boolean, boolean]; validatedLevel: number }) {
  const mastered = validatedLevel === 3;
  const seg = (on: boolean, label: string) => (
    <span
      className={`inline-flex h-5 min-w-6 items-center justify-center rounded px-1 text-[10px] font-bold ${
        mastered ? "bg-emerald-500/15 text-emerald-400" : on ? "bg-brand-500/15 text-brand-300" : "bg-ink-3/10 text-ink-3"
      }`}
    >
      {label}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1" title={`Level ${validatedLevel} of 3`}>
      {seg(levels[0], "L1")}
      {seg(levels[1], "L2")}
      {seg(levels[2], "L3")}
    </span>
  );
}

export function SkillChip({ name, status }: { name: string; status?: EvaluationStatus }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-edge bg-surface px-2.5 py-1 text-xs font-medium text-ink">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500/100" />
      {name}
      {status && (
        <StatusBadge status={status} label={EVALUATION_STATUS_LABELS[status]} />
      )}
    </span>
  );
}

export function SkillValidationList({
  items,
}: {
  items: (EvaluationView & { feedback: string })[];
}) {
  return (
    <ul className="divide-y divide-edge-soft">
      {items.map((item) => (
        <li key={item.skillId} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-ink">{item.skillName}</p>
              <StatusBadge status={item.status} label={EVALUATION_STATUS_LABELS[item.status]} />
              <LevelIndicator
                levels={[item.level1Validated, item.level2Validated, item.level3Validated]}
                validatedLevel={item.validatedLevel}
              />
            </div>
            {item.feedback && (
              <p className="mt-1 text-sm text-ink-2">“{item.feedback}”</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}