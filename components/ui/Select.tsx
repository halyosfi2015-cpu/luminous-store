import { ChevronDown } from "lucide-react";
import { type Ref } from "react";

type SelectProps = React.ComponentProps<"select"> & {
  label?: string;
  error?: string;
  ref?: Ref<HTMLSelectElement>;
};

export default function Select({
  label,
  error,
  id,
  ref,
  className = "",
  children,
  ...props
}: SelectProps) {
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
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={`
            h-11 w-full appearance-none rounded-input border bg-card
            ps-4 pe-10 text-sm text-foreground outline-none transition-all
            duration-200 ease-out-smooth focus:border-primary focus:ring-2 focus:ring-primary/15
            disabled:cursor-not-allowed disabled:opacity-60
            ${error ? "border-error" : "border-border"}
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted">
          <ChevronDown className="h-4 w-4" />
        </span>
      </div>
      {error && (
        <p className="mt-1.5 text-xs font-medium text-error">{error}</p>
      )}
    </div>
  );
}
