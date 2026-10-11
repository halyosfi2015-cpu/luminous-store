"use client";

import Link from "next/link";
import { Fingerprint, Tag, Package, Layers, Store, Gift, type LucideIcon } from "lucide-react";
import { useLang } from "@/lib/use-lang";

/**
 * MOBILE-ONLY discovery stories (Sephora-style): round tappable shortcuts
 * above the fold. Reversible: remove usage in HomeSections hero slot.
 */
const STORIES: { href: string; ar: string; en: string; icon: LucideIcon; ring: string }[] = [
  { href: "/quiz", ar: "بشرتي", en: "Quiz", icon: Fingerprint, ring: "from-primary via-fuchsia-500 to-secondary" },
  { href: "/#offers", ar: "العروض", en: "Offers", icon: Tag, ring: "from-amber-400 via-orange-500 to-rose-500" },
  { href: "/new-arrivals", ar: "جديد", en: "New", icon: Package, ring: "from-emerald-400 via-teal-500 to-cyan-500" },
  { href: "/routines", ar: "روتينات", en: "Routines", icon: Layers, ring: "from-sky-400 via-blue-500 to-indigo-500" },
  { href: "/brands", ar: "ماركات", en: "Brands", icon: Store, ring: "from-violet-400 via-purple-500 to-primary" },
  { href: "/bundles", ar: "باقات", en: "Bundles", icon: Gift, ring: "from-rose-400 via-pink-500 to-accent" },
];

export default function HomeStories() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  // Direct smooth scroll to the offers section (works even if router
  // hash handling stumbles; falls back to plain anchor navigation).
  const scrollToOffers = (e: React.MouseEvent) => {
    try {
      if (window.location.pathname !== "/") return;
      const el = document.getElementById("offers");
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch { /* fallback: default anchor behavior */ }
  };
  return (
    <div className="relative z-10 mt-5 sm:hidden" dir={isAr ? "rtl" : "ltr"}>
      <div className="hide-scrollbar -mx-4 flex snap-x justify-between gap-2 overflow-x-auto px-4 pb-2 pt-2">
        {STORIES.map((s, i) => {
          const spotlight = i === 0;
          return (
          <Link
            key={s.href}
            href={s.href}
            onClick={s.href === "/#offers" ? scrollToOffers : undefined}
            className="magic-float-y flex w-[46px] shrink-0 snap-start flex-col items-center gap-1"
            style={{ animationDelay: `${i * 180}ms` }}
          >
            <span className={spotlight ? "magic-halo rounded-full p-[2.5px] shadow-lg shadow-fuchsia-500/40" : `rounded-full bg-gradient-to-br p-[2px] ${s.ring}`}>
              <span className={`flex items-center justify-center rounded-full bg-white text-primary ${spotlight ? "h-[48px] w-[48px]" : "h-[42px] w-[42px]"}`}>
                <s.icon size={spotlight ? 21 : 18} strokeWidth={spotlight ? 2.2 : 1.8} />
              </span>
            </span>
            <span className={`max-w-[52px] truncate font-bold text-foreground ${spotlight ? "text-[10px]" : "text-[10.5px]"}`}>
              {isAr ? s.ar : s.en}
            </span>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
