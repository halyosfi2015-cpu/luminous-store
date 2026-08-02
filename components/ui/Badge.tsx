type BadgeVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "error"
  | "neutral"
  | "outline";

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary/10 text-primary border border-primary/20",
  secondary: "bg-secondary-100 text-secondary-700 border border-secondary-200",
  accent: "bg-accent/10 text-accent-700 border border-accent/25",
  success: "bg-success-soft text-success-fg border border-success-border",
  warning: "bg-warning-soft text-warning-fg border border-warning-border",
  error: "bg-error-soft text-error-fg border border-error-border",
  neutral: "bg-muted-bg text-muted border border-border",
  outline: "bg-transparent text-muted border border-border",
};

export default function Badge({
  children,
  variant = "neutral",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1
        text-xs font-medium leading-none whitespace-nowrap
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
