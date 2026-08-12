type SectionTitleProps = {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  light?: boolean;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
};

export default function SectionTitle({
  title,
  subtitle,
  align = "left",
  light = false,
  eyebrow,
  action,
}: SectionTitleProps) {
  const textColor = light ? "text-white" : "text-foreground";
  const mutedColor = light ? "text-white/70" : "text-muted";

  return (
    <div
      className={`
        mb-10 flex flex-wrap items-end justify-between gap-4
        ${align === "center" ? "flex-col text-center" : ""}
      `}
    >
      <div className={align === "center" ? "mx-auto flex flex-col items-center" : ""}>
        {eyebrow && (
          <span className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-secondary">
            {typeof eyebrow === "string" && <span className="h-0.5 w-6 rounded-pill bg-accent" />}
            {eyebrow}
          </span>
        )}
        <div className="flex items-center gap-3 mb-2">
          {typeof eyebrow !== "object" && (
            <span className="h-0.5 w-8 rounded-full bg-accent" />
          )}
          <h2
            className={`
              text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl
              leading-tight
              ${textColor}
            `}
          >
            {title}
          </h2>
        </div>
        {subtitle && (
          <p
            className={`
              mt-2 max-w-2xl text-sm leading-relaxed sm:text-base
              ${align === "center" ? "mx-auto" : ""}
              ${mutedColor}
            `}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className={`shrink-0 pb-1 ${align === "center" ? "mx-auto" : ""}`}>{action}</div>
      )}
    </div>
  );
}
