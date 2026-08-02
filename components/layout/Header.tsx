"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Sparkles, User, Heart, ShoppingCart, ArrowLeftRight, Menu, X, PackageSearch, ChevronDown } from "lucide-react";
import LayoutContainer from "@/components/ui/Container";
import IconButton from "@/components/ui/IconButton";
import SearchTrigger from "@/components/search/SearchTrigger";
import Logo from "@/components/layout/Logo";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCompare } from "@/context/CompareContext";
import { useLang } from "@/lib/use-lang";
import { navigation } from "@/src/data/navigation";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState<string | null>(null);
  const { lang } = useLang();
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { count: compareCount } = useCompare();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isAr = lang === "ar";

  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setNavOpen(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [handleOutsideClick]);

  const headerClassName =
    "w-full sticky top-0 z-40 transition-all duration-300 " +
    (scrolled
      ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-border"
      : "bg-white border-b border-transparent");

  return (
    <>
      <div ref={dropdownRef} data-nav-dropdown className={headerClassName}>
        <div className="relative">
          <LayoutContainer className="relative">
            <div className="flex h-20 items-center justify-between gap-3 sm:gap-4 rtl:flex-row-reverse">
              <div className="flex shrink-0 items-center gap-3">
                <Logo />
              </div>

              <div className="flex-1 flex items-center justify-center min-w-0">
                <SearchTrigger className="w-full max-w-xl" />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="hidden sm:flex">
                  <IconButton
                    variant="ghost"
                    aria-label={isAr ? "تتبع الطلب" : "Track Order"}
                    onClick={() => setMenuOpen(true)}
                  >
                    <PackageSearch className="w-5 h-5" />
                  </IconButton>
                </div>

                <IconButton
                  variant="ghost"
                  aria-label={isAr ? "المفضلة" : "Wishlist"}
                  className="relative"
                  href="/wishlist"
                >
                  <Heart className="w-5 h-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                      {wishlistCount > 9 ? "9+" : wishlistCount}
                    </span>
                  )}
                </IconButton>

                <div className="hidden lg:flex">
                  <IconButton
                    variant="ghost"
                    aria-label={isAr ? "المقارنة" : "Compare"}
                    className="relative"
                    href="/compare"
                  >
                    <ArrowLeftRight className="w-5 h-5" />
                    {compareCount > 0 && (
                      <span className="absolute -top-0.5 -end-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                        {compareCount}
                      </span>
                    )}
                  </IconButton>
                </div>

                <Link
                  href="/cart"
                  className="relative flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-all duration-200 ease-out-smooth hover:bg-primary-light hover:shadow-primary active:scale-95"
                  aria-label={isAr ? "عربة التسوق" : "Shopping Cart"}
                >
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    {totalItems > 0 && (
                      <span className="absolute -top-1.5 -end-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                        {totalItems > 9 ? "9+" : totalItems}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline">{isAr ? "السلة" : "Cart"}</span>
                </Link>

                <IconButton
                  variant="ghost"
                  aria-label={isAr ? "الحساب" : "Account"}
                  className="relative"
                  href="/account"
                >
                  <User className="w-5 h-5" />
                </IconButton>

                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden rounded-full border border-border bg-card p-2"
                  aria-label={isAr ? "القائمة" : "Menu"}
                  aria-expanded={menuOpen}
                >
                  {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>

            <div className="hidden md:block">
              <nav
                className="relative flex items-center justify-center gap-1 py-2.5"
                aria-label={isAr ? "القائمة الرئيسية" : "Main Navigation"}
              >
                <ul className="flex items-center gap-0.5" role="menubar">
                  {navigation.main.map((item) => (
                    <li key={item.id} className="relative" role="none">
                      {item.children ? (
                        <>
                          <button
                            type="button"
                            role="menuitem"
                            aria-haspopup="true"
                            aria-expanded={navOpen === item.id}
                            onClick={() => setNavOpen(navOpen === item.id ? null : item.id)}
                            className={
                              "relative flex items-center gap-1 px-3.5 py-2 text-sm font-medium transition-colors " +
                              (navOpen === item.id
                                ? "text-primary"
                                : "text-muted hover:text-foreground")
                            }
                          >
                            <span>{isAr ? item.label.ar : item.label.en}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${navOpen === item.id ? "rotate-180" : ""}`}
                            />
                            <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-center rounded-full bg-primary transition-transform duration-200 ease-out-smooth scale-x-0 group-hover:scale-x-100"
                              style={{ transform: navOpen === item.id ? "scaleX(1)" : "scaleX(0)" }}
                            />
                          </button>
                          {navOpen === item.id && (
                            <div
                              className="absolute top-full start-0 z-50 mt-1 w-64 rounded-xl border border-border bg-white shadow-lg overflow-hidden animate-slide-down"
                              role="menu"
                            >
                              <ul className="py-2" role="none">
                                {item.children?.map((child) => (
                                  <li key={child.id} role="none">
                                    <Link
                                      href={child.href}
                                      role="menuitem"
                                      onClick={() => setNavOpen(null)}
                                      className="block px-4 py-2.5 text-sm text-muted hover:bg-accent hover:text-foreground transition-colors"
                                    >
                                      {isAr ? child.label.ar : child.label.en}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <Link
                          href={item.href}
                          role="menuitem"
                          className="relative flex items-center px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
                        >
                          <span>{isAr ? item.label.ar : item.label.en}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {menuOpen && (
              <div className="md:hidden border-t border-border bg-white animate-slide-down">
                <nav className="p-4" aria-label={isAr ? "القائمة الجانبية" : "Mobile Menu"}>
                  <ul className="flex flex-col gap-1" role="menu">
                    {navigation.main.map((item) => (
                      <li key={item.id} role="none">
                        <Link
                          href={item.href || (item.children?.[0]?.href ?? "/")}
                          role="menuitem"
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-accent transition-colors"
                          onClick={() => setMenuOpen(false)}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="w-4.5 h-4.5" />
                          </span>
                          <span>{isAr ? item.label.ar : item.label.en}</span>
                        </Link>
                      </li>
                    ))}
                    <li role="none">
                      <Link
                        href="/compare"
                        role="menuitem"
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-accent transition-colors"
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <ArrowLeftRight className="w-4.5 h-4.5" />
                        </span>
                        <span>{isAr ? "المقارنة" : "Compare"}</span>
                        {compareCount > 0 && (
                          <span className="ms-auto flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">
                            {compareCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  </ul>
                  <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-border">
                    <Link
                      href="/account"
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      <User className="w-5 h-5" />
                      <span>{isAr ? "حسابي" : "My Account"}</span>
                    </Link>
                    <Link
                      href="/wishlist"
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      <Heart className="w-5 h-5" />
                      <span>{isAr ? "المفضلة" : "Wishlist"}</span>
                      {wishlistCount > 0 && (
                        <span className="ms-auto flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">
                          {wishlistCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/cart"
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span>{isAr ? "السلة" : "Cart"}</span>
                      {totalItems > 0 && (
                        <span className="ms-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                          {totalItems}
                        </span>
                      )}
                    </Link>
                  </div>
                </nav>
              </div>
            )}
          </LayoutContainer>
        </div>
      </div>
      <style jsx>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slide-down 150ms ease-out; }
      `}</style>
    </>
  );
}
