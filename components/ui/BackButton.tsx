"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/use-lang";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useLang();
  const [show, setShow] = useState(false);

  const isHome = pathname === "/";
  const isAr = lang === "ar";

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isHome) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      aria-label={isAr ? "رجوع" : "Back"}
      className={`fixed top-24 start-4 z-40 flex items-center gap-2 rounded-full border border-border bg-white/95 px-3.5 py-2.5 text-sm font-medium text-foreground shadow-lg backdrop-blur transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:text-primary active:scale-95 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
      }`}
    >
      {isAr ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
      <span className="hidden sm:inline">{isAr ? "رجوع" : "Back"}</span>
    </button>
  );
}
