type SectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  muted?: boolean;
  style?: React.CSSProperties;
};

export default function Section({
  children,
  className = "",
  id,
  muted = false,
  style,
}: SectionProps) {
  return (
    <section
      id={id}
      style={style}
      className={`
        py-16 sm:py-20 lg:py-24
        ${muted ? "bg-muted-bg/60" : "bg-transparent"}
        ${className}
      `}
    >
      {children}
    </section>
  );
}
