export default function Spinner({ className = "" }: { className?: string }) {
  return <div className={`sb-spinner ${className}`} role="status" aria-label="Loading…" />;
}

export function LoadingState({
  label = "Loading…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-16 text-ink-3 ${className}`}
    >
      <Spinner />
      <p className="text-sm">{label}</p>
    </div>
  );
}