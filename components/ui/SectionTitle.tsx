import MobileReveal from "@/components/ui/MobileReveal";

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
  const mutedColor = light ? "text-white/70" : "text-muted";

  return (
    <MobileReveal>
    <div
      className={`
        section-head mb-10 flex flex-wrap items-end justify-between gap-4
        ${align === "center" ? "flex-col text-center" : "max-sm:flex-nowrap max-sm:items-center max-sm:gap-2"}
      `}
    >
      <div className={`${align === "center" ? "mx-auto flex flex-col items-center" : "max-sm:min-w-0 max-sm:flex-1"}`}>
        {eyebrow && (
          typeof eyebrow === "string" ? (
            <span className="magic-eyebrow">
              <span className="magic-star" aria-hidden="true" />
              {eyebrow}
            </span>
          ) : (
            <span className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-secondary">
              {eyebrow}
            </span>
          )
        )}
        <div className="flex items-center gap-3 mb-2">
          {typeof eyebrow !== "object" && (
            <span className="magic-bar" aria-hidden="true" />
          )}
          <h2
            className={`
              text-[22px] font-bold tracking-tight sm:text-4xl lg:text-5xl
              leading-tight
              ${light ? "magic-title-light" : "magic-title"}
            `}
          >
            {title}
          </h2>
        </div>
        {subtitle && (
          <p
            className={`
              section-subtitle mt-2 max-w-2xl text-sm leading-relaxed sm:text-base
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
    </MobileReveal>
  );
}
