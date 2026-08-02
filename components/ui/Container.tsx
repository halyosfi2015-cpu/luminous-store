type ContainerProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "section" | "article" | "main" | "header" | "footer" | "nav";
};

export default function Container({
  children,
  className = "",
  style,
  as: Tag = "div",
}: ContainerProps) {
  return (
    <Tag
      className={`
        mx-auto w-full max-w-7xl
        px-4 sm:px-6 lg:px-8
        ${className}
      `}
      style={style}
    >
      {children}
    </Tag>
  );
}
