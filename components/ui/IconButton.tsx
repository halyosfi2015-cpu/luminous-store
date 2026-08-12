type IconButtonVariant = "default" | "primary" | "secondary" | "ghost" | "outline";
type IconButtonSize = "sm" | "md" | "lg";

type IconButtonProps = {
  children: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  className?: string;
  href?: string;
};

const variantStyles: Record<IconButtonVariant, string> = {
  default:
    "bg-card text-foreground border border-border shadow-card hover:border-primary/30 hover:text-primary hover:shadow-card-hover",
  primary:
    "bg-primary text-white shadow-card hover:bg-primary-700 hover:shadow-primary",
  secondary: "bg-secondary text-primary-950 shadow-card hover:bg-secondary-300",
  ghost: "bg-transparent text-foreground hover:bg-primary/10 hover:text-primary",
  outline:
    "bg-transparent text-foreground border border-border hover:border-primary/40 hover:text-primary",
};

const linkVariantStyles: Record<IconButtonVariant, string> = {
  default: "bg-card text-foreground border border-border shadow-card hover:border-primary/30 hover:text-primary hover:shadow-card-hover",
  primary: "bg-primary text-white shadow-card hover:bg-primary-700 hover:shadow-primary",
  secondary: "bg-secondary text-primary-950 shadow-card hover:bg-secondary-300",
  ghost: "bg-transparent text-foreground hover:bg-primary/10 hover:text-primary",
  outline: "bg-transparent text-foreground border border-border hover:border-primary/40 hover:text-primary",
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

export default function IconButton({
  children,
  variant = "default",
  size = "md",
  className = "",
  href,
  ...rest
}: IconButtonProps & Record<string, unknown>) {
  const baseButtonClass = `
    inline-flex shrink-0 items-center justify-center rounded-full
    transition-all duration-200 ease-out-smooth
    active:scale-90
    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light
    disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100
    ${variantStyles[variant] || variantStyles.default}
    ${sizeStyles[size] || sizeStyles.md}
    ${className}
  `;

  const baseLinkClass = `
    inline-flex shrink-0 items-center justify-center rounded-full
    transition-all duration-200 ease-out-smooth
    active:scale-90
    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light
    ${linkVariantStyles[variant] || linkVariantStyles.default}
    ${sizeStyles[size] || sizeStyles.md}
    ${className}
  `;

  if (href) {
    return (
      <a
        href={href}
        className={baseLinkClass}
        {...rest as React.AnchorHTMLAttributes<HTMLAnchorElement>}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={baseButtonClass}
      {...rest as React.ButtonHTMLAttributes<HTMLButtonElement>}
    >
      {children}
    </button>
  );
}