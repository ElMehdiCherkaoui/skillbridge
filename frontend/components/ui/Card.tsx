import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card-header flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = "" }: CardProps) {
  return <div className={`card-body ${className}`}>{children}</div>;
}

const statAccents: Record<string, string> = {
  brand: "from-brand-500 to-violet-600",
  emerald: "from-emerald-500 to-teal-600",
  amber: "from-amber-500 to-orange-600",
  rose: "from-rose-500 to-pink-600",
  sky: "from-sky-500 to-indigo-600",
  violet: "from-violet-500 to-purple-600",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "brand",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: "brand" | "emerald" | "amber" | "rose" | "sky" | "violet";
}) {
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-brand-500/10 to-violet-500/5 blur-xl" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-3">{label}</p>
        {icon && (
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${statAccents[accent]}`}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2.5 text-[2rem] font-bold leading-none tracking-tight text-ink tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

/** Page-level heading block, kept consistent across every workspace page. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}