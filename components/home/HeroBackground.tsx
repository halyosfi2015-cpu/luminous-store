"use client";

interface HeroBackgroundProps {
  gradientVar: string;
  isDark: boolean;
  sectionKey: number;
}

export default function HeroBackground({
  gradientVar,
  isDark,
}: HeroBackgroundProps) {
  return (
    <div
      className={`
        absolute inset-0
        transition-[background] duration-[1000ms]
        ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
      `}
      data-dark={isDark}
      style={{
        background: `var(--${gradientVar})`,
        willChange: "background",
      }}
      aria-hidden="true"
    >
      {/* Noise texture — subtle Apple-style grain */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "256px",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
