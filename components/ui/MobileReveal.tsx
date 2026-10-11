"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mobile-only scroll reveal (desktop renders instantly, unchanged).
 * Self-contained: no global CSS, no libraries.
 */
export default function MobileReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Desktop and reduced-motion: show instantly, zero animation.
    if (
      window.matchMedia("(min-width: 640px)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div
        ref={ref}
        style={{ transitionDelay: `${delay}ms` }}
        className={`mreveal ${on ? "mreveal-on" : ""} ${className}`}
      >
        {children}
      </div>
      <style jsx>{`
        @media (max-width: 639.98px) {
          .mreveal {
            opacity: 0;
            transform: translateY(24px);
            transition:
              opacity 600ms ease,
              transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
            will-change: opacity, transform;
          }
          .mreveal-on {
            opacity: 1;
            transform: none;
            will-change: auto;
          }
        }
      `}</style>
    </>
  );
}
