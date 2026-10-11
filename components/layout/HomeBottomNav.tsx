"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/lib/use-lang";

/**
 * MOBILE-HOME-ONLY bottom nav (like app-style stores). Rendered only on "/".
 * Reversible: remove the import + usage in app/page.tsx.
 */
export default function HomeBottomNav() {
  const pathname = usePathname();
  const { lang } = useLang();
  const { totalItems } = useCart();
  const isAr = lang === "ar";

  // Visible on browsing pages (mobile only) so Home/Categories stay active.
  // Excluded where sticky purchase/cart bars live (/cart, /products, checkout).
  const allowed = ["/", "/categories", "/account", "/quiz"];
  const onAllowed = allowed.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
  if (!onAllowed) return null;

  const items = [
    { href: "/", icon: Home, label: isAr ? "الرئيسية" : "Home", active: pathname === "/" },
    { href: "/categories", icon: LayoutGrid, label: isAr ? "الأقسام" : "Categories", active: pathname.startsWith("/categories") },
    { href: "/cart", icon: ShoppingCart, label: isAr ? "السلة" : "Cart", active: pathname.startsWith("/cart"), badge: totalItems },
    { href: "/account", icon: User, label: isAr ? "حسابي" : "Account", active: pathname.startsWith("/account") },
  ];

  return (
    <>
      {/* In-flow spacer so the fixed bar never covers footers */}
      <div aria-hidden="true" className="h-[68px] md:hidden" />
    <nav
      aria-label={isAr ? "التنقل السريع" : "Quick navigation"}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4">
        {items.slice(0, 2).map((it) => (
          <Link
            key={it.href + it.label}
            href={it.href}
            aria-current={it.active ? "page" : undefined}
            className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
              it.active ? "text-primary" : "text-muted hover:text-primary"
            }`}
          >
            {it.active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-primary shadow-[0_0_10px_rgba(75,42,111,0.9)]" />}
            <span className="relative">
              <it.icon size={20} />
              {typeof it.badge === "number" && it.badge > 0 && (
                <span className="absolute -top-1.5 -end-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
                  {it.badge > 9 ? "9+" : it.badge}
                </span>
              )}
            </span>
            {it.label}
          </Link>
        ))}
        {items.slice(2).map((it) => (
          <Link
            key={it.href + it.label}
            href={it.href}
            aria-current={it.active ? "page" : undefined}
            className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
              it.active ? "text-primary" : "text-muted hover:text-primary"
            }`}
          >
            {it.active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-primary shadow-[0_0_10px_rgba(75,42,111,0.9)]" />}
            <span className="relative">
              <it.icon size={20} />
              {typeof it.badge === "number" && it.badge > 0 && (
                <span className="absolute -top-1.5 -end-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
                  {it.badge > 9 ? "9+" : it.badge}
                </span>
              )}
            </span>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
    </>
  );
}
