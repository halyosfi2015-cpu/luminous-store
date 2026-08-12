import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  className?: string;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-card hover:bg-primary-700 hover:shadow-primary active:bg-primary-800",
  secondary:
    "bg-secondary text-primary-950 shadow-card hover:bg-secondary-300 active:bg-secondary-400",
  outline:
    "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white hover:shadow-primary",
  ghost: "bg-transparent text-primary hover:bg-primary/10 active:bg-primary/15",
  danger:
    "bg-error text-white shadow-card hover:bg-error-fg active:opacity-90",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-sm gap-1.5",
  md: "px-6 py-2.5 text-sm gap-2",
  lg: "px-8 py-3.5 text-base gap-2.5",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  onClick,
  className = "",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium
        rounded-button
        transition-all duration-200 ease-out-smooth
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light
        disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none
        enabled:hover:-translate-y-px enabled:active:translate-y-0 enabled:active:scale-[0.98]
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      )}
      {children}
    </button>
  );
}
