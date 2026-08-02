import { type Ref } from "react";

type TextareaProps = React.ComponentProps<"textarea"> & {
  label?: string;
  error?: string;
  hint?: string;
  ref?: Ref<HTMLTextAreaElement>;
};

export default function Textarea({
  label,
  error,
  hint,
  id,
  ref,
  className = "",
  rows = 4,
  ...props
}: TextareaProps) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={`
          w-full rounded-input border bg-card px-4 py-3 text-sm text-foreground
          placeholder:text-muted/70 outline-none transition-all duration-200 ease-out-smooth
          focus:border-primary focus:ring-2 focus:ring-primary/15
          disabled:cursor-not-allowed disabled:opacity-60
          resize-y
          ${error ? "border-error" : "border-border"}
          ${className}
        `}
        {...props}
      />
      {hint && !error && (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs font-medium text-error">{error}</p>
      )}
    </div>
  );
}
