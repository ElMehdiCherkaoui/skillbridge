const variants: Record<string, string> = {
  validated:
    "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/25 dot-emerald",
  not_validated: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 dot-rose",
  rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 dot-rose",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 dot-amber",
  assigned: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25 dot-sky",
  in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25 dot-blue",
  submitted: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25 dot-violet",
  under_review: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25 dot-purple",
  completed: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/25 dot-emerald",
  draft: "bg-surface-2/10 text-ink-2 dark:text-ink-3 border-slate-500/25 dot-slate",
  published: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25 dot-sky",
  archived: "bg-surface-2/10 text-ink-2 dark:text-ink-2 border-slate-500/25 dot-slate",
  admin: "bg-brand-500/100/10 text-brand-500 dark:text-brand-400 border-brand-500/25 dot-brand",
  student: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25 dot-teal",
  assigned_pending: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25 dot-sky",
};

export default function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const dot = (variants[status] ?? "").match(/dot-[a-z]+/)?.[0]?.replace("dot-", "");
  const palette = variants[status]?.replace(/\s+dot-[a-z]+/, "") ?? "bg-surface-2/10 text-ink-2 dark:text-ink-3 border-slate-500/25";
  const dotColor =
    {
      emerald: "bg-emerald-500",
      rose: "bg-rose-500",
      amber: "bg-amber-500",
      sky: "bg-sky-500",
      blue: "bg-blue-500",
      violet: "bg-violet-500",
      purple: "bg-purple-500",
      slate: "bg-slate-400",
      brand: "bg-brand-500/100",
      teal: "bg-teal-500",
    }[dot ?? "slate"] ?? "bg-slate-400";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${palette}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

export function HumanizeStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}