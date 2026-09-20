import { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon = <Inbox className="h-9 w-9 text-brand-400" />,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-edge bg-surface/50 px-6 py-14 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-violet-500/10">
        {icon}
      </div>
      <h3 className="text-base font-semibold tracking-tight text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm leading-relaxed text-ink-2">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}