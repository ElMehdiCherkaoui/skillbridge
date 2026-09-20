import { ReactNode } from "react";

export function ProgressBar({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label?: string;
}) {
  const pct = total <= 0 ? 0 : Math.min(100, Math.round((value / total) * 100));
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-ink-2">
          <span>{label}</span>
          <span className="font-medium tabular-nums">
            {value}/{total} ({pct}%)
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full origin-left rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-transform duration-300"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  );
}

/**
 * Segment progress bar for skill validation — shows the validated / pending /
 * not-validated split as a single track. The signature SkillBridge motif.
 */
export function SkillProgressBar({
  validated,
  pending,
  rejected,
  total,
  label,
}: {
  validated: number;
  pending: number;
  rejected: number;
  total: number;
  label?: string;
}) {
  if (total <= 0) {
    return (
      <div>
        {label && <div className="mb-1 text-xs text-ink-2">{label}</div>}
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" />
      </div>
    );
  }
  const v = (validated / total) * 100;
  const p = (pending / total) * 100;
  const r = (rejected / total) * 100;
  const segments: { pct: number; cls: string }[] = [];
  if (v > 0.5) segments.push({ pct: v, cls: "bg-emerald-500" });
  if (p > 0.5) segments.push({ pct: p, cls: "bg-amber-400/90" });
  if (r > 0.5) segments.push({ pct: r, cls: "bg-rose-500" });
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-ink-2">{label}</span>
          <span className="font-medium tabular-nums text-ink-2">
            {validated}/{total} validated
          </span>
        </div>
      )}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2 [&>div]:transition-all [&>div]:duration-500">
        {segments.map((s, i) => (
          <div key={i} className={`${s.cls}`} style={{ width: `${s.pct}%` }} />
        ))}
      </div>
      <div className="mt-1.5 flex gap-4 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> {validated} validated
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400/90" /> {pending} pending
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> {rejected} not validated
        </span>
      </div>
    </div>
  );
}

export function Alert({
  kind = "info",
  children,
}: {
  kind?: "info" | "success" | "error" | "warning";
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    info: "bg-sky-500/10 border-sky-500/25 text-sky-700 dark:text-sky-300",
    success: "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300",
    error: "bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300",
    warning: "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300",
  };
  return (
    <div aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm ${styles[kind]}`}>
      {children}
    </div>
  );
}