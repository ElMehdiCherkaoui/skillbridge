import {
  ReactNode,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  cloneElement,
  isValidElement,
  useId,
} from "react";

interface FieldWrapProps {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, children }: FieldWrapProps) {
  const generatedId = useId();
  const childId =
    isValidElement(children) && (children.props as { id?: string }).id
      ? (children.props as { id?: string }).id
      : generatedId;
  const hintId = `${childId}-hint`;
  const errorId = `${childId}-error`;

  const existingClass = isValidElement(children)
    ? (children.props as { className?: string }).className ?? ""
    : "";
  const control =
    isValidElement(children)
      ? cloneElement(children, {
          id: childId,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": error ? errorId : hint ? hintId : undefined,
          className: `${existingClass} ${error ? "border-rose-500/60 focus:ring-rose-500/15" : ""}`,
        } as { id: string; "aria-invalid": boolean | undefined; "aria-describedby": string | undefined; className: string })
      : children;

  return (
    <div>
      {label && (
        <label htmlFor={childId} className="label">
          {label}
        </label>
      )}
      {control}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({
  label,
  error,
  hint,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input className={`input ${className}`} {...props} />
    </Field>
  );
}

export function TextArea({
  label,
  error,
  hint,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <textarea className={`input min-h-[96px] ${className}`} {...props} />
    </Field>
  );
}

export function SelectInput({
  label,
  error,
  hint,
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      <select className={`input ${className}`} {...props}>
        {children}
      </select>
    </Field>
  );
}

/** Grouped toggle — e.g. status filter pills. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center gap-1 rounded-xl border border-edge bg-surface-2/60 p-1"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}