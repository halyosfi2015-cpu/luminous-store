"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  index?: number;
  className?: string;
  /** إظهار المحتوى مباشرة عند أول تحميل (للقسم المرئي في الشاشة) */
  immediate?: boolean;
};

function isInInitialViewport(el: HTMLElement): boolean {
  if (typeof window === "undefined") return true;
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

/* Scroll-triggered reveal — professional staggered entrance */
export default function Reveal({ children, index = 0, className = "", immediate = false }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(immediate);

  useLayoutEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    // إذا كان العنصر داخل الشاشة عند أول تحميل، اظهره فوراً بدون ضبابية
    if (isInInitialViewport(el)) {
      setInView(true);
      return;
    }
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          ob.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [inView]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out-smooth ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0) scale(1)" : "translateY(24px) scale(0.96)",
        transitionDelay: `${Math.min(index * 45, 320)}ms`,
      }}
    >
      {children}
    </div>
  );
}
