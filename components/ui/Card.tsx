type CardPadding = "sm" | "md" | "lg";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: CardPadding;
};

const paddingStyles: Record<CardPadding, string> = {
  sm: "p-4 sm:p-5",
  md: "p-5 sm:p-6 lg:p-8",
  lg: "p-6 sm:p-8 lg:p-10",
};

export default function Card({
  children,
  className = "",
  hover = false,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={`
        rounded-card
        bg-card
        border border-border
        shadow-card
        transition-all duration-300 ease-out-smooth
        ${hover ? "hover:shadow-card-hover hover:-translate-y-0.5" : ""}
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
