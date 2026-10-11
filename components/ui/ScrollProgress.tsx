"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/use-lang";

/**
 * Legendary scroll progress — gold hairline growing under the header as you
 * read. rAF-throttled, RTL-aware, hidden on short pages and reduced-motion.
 */
export default function ScrollProgress() {
  const { lang } = useLang();
  const [progress, setProgress] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setEnabled(true);
    const update = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 40 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!enabled || progress <= 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]"
      dir="ltr"
    >
      <div
        className="h-full w-full bg-gradient-to-r from-primary via-accent to-[#F7D98C] shadow-[0_0_10px_rgba(212,175,55,0.7)]"
        style={{
          transform: `scaleX(${progress})`,
          transformOrigin: lang === "ar" ? "right" : "left",
        }}
      />
    </div>
  );
}
