"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  User,
  Heart,
  ShoppingCart,
  Scale,
  Menu,
  X,
  Truck,
  ChevronDown,
  LayoutGrid,
  Gift,
  Home,
  Flower2,
  Store,
  BadgeCheck,
} from "lucide-react";
import LayoutContainer from "@/components/ui/Container";
import IconButton from "@/components/ui/IconButton";
import SearchTrigger from "@/components/search/SearchTrigger";
import Logo from "@/components/layout/Logo";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCompare } from "@/context/CompareContext";
import { useLang } from "@/lib/use-lang";
import ModernMegaMenu from "@/components/layout/ModernMegaMenu";
import TrackOrderModal from "@/components/layout/TrackOrderModal";

type MegaType = "categories";

interface NavItem {
  id: string;
  labelAr: string;
  labelEn: string;
  href?: string;
  mega?: MegaType;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  sectionId?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    labelAr: "الرئيسية",
    labelEn: "Home",
    href: "/",
    icon: Home,
  },
  {
    id: "categories",
    labelAr: "جميع الأقسام",
    labelEn: "All Categories",
    mega: "categories",
    icon: LayoutGrid,
  },
  {
    id: "offers",
    labelAr: "العروض",
    labelEn: "Offers",
    href: "/offers",
    icon: Sparkles,
  },
  {
    id: "bundles",
    labelAr: "باقات وهدايا",
    labelEn: "Bundles & Gifts",
    sectionId: "bundles",
    icon: Gift,
  },
  {
    id: "services",
    labelAr: "خدماتنا التجميلية",
    labelEn: "Beauty Services",
    href: "/#services",
    icon: Sparkles,
  },
  {
    id: "new-arrivals",
    labelAr: "وصل حديثاً",
    labelEn: "New Arrivals",
    href: "/#new-arrivals",
    icon: Sparkles,
  },
  {
    id: "routines",
    labelAr: "الروتينات المتكاملة",
    labelEn: "Complete Routines",
    icon: Flower2,
  },
  {
    id: "brands",
    labelAr: "العلامات التجارية",
    labelEn: "Beauty Partners",
    sectionId: "brands",
    icon: Store,
  },
  {
    id: "experts",
    labelAr: "خبراء موثوقون",
    labelEn: "Trusted Experts",
    sectionId: "experts",
    icon: BadgeCheck,
  },
];

function getMobileHref(item: NavItem): string {
  if (item.href) return item.href;
  if (item.mega === "categories") return "/categories";
  if (item.mega === "services") return "/contact";
  if (item.sectionId) return `/#${item.sectionId}`;
  return "/";
}

const isOffersItem = (item: NavItem) => item.id === "offers";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MegaType | null>(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const { lang } = useLang();
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { count: compareCount } = useCompare();
  const navTriggerRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isRoutinesItem = (item: NavItem) => item.id === "routines";
  const isSectionItem = (item: NavItem) => Boolean(item.sectionId);

  const handleSectionClick = (sectionId: string | undefined, e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!sectionId) return;
    const scroll = () => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (pathname === "/") {
      scroll();
      return;
    }
    router.push("/");
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (document.getElementById(sectionId)) {
        window.clearInterval(timer);
        scroll();
      } else if (attempts > 60) {
        window.clearInterval(timer);
      }
    }, 100);
  };

  const handleRoutinesClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    const scroll = () => {
      const el = document.getElementById("routines");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (pathname === "/") {
      scroll();
      return;
    }
    router.push("/");
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (document.getElementById("routines")) {
        window.clearInterval(timer);
        scroll();
      } else if (attempts > 60) {
        window.clearInterval(timer);
      }
    }, 100);
  };

  const handleOffersClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    router.push("/offers");
  };

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setActiveMenu(null), 150);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const isAr = lang === "ar";

  const headerClassName =
    "w-full sticky top-0 z-40 transition-all duration-300 " +
    (scrolled
      ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-border"
      : "bg-white border-b border-transparent");

  return (
    <>
      <div data-nav-dropdown className={headerClassName}>
        <div className="relative">
          <LayoutContainer className="relative">
            <div className="flex min-h-[96px] py-2 items-center justify-between gap-3 sm:gap-4 rtl:flex-row-reverse">
              <div className="flex shrink-0 items-center">
                <Logo />
              </div>

              <div className="flex-1 flex items-center justify-center min-w-0">
                <SearchTrigger className="w-full max-w-xl" />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setTrackOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition-all duration-200 hover:border-primary/40 hover:text-primary"
                  aria-label={isAr ? "تتبع الطلب" : "Track Order"}
                >
                  <Truck size={15} className="text-primary" />
                  <span className="hidden xl:inline">{isAr ? "تتبع الطلب" : "Track Order"}</span>
                  <span className="xl:hidden">{isAr ? "تتبع" : "Track"}</span>
                </button>

                <IconButton
                  variant="ghost"
                  aria-label={isAr ? "المفضلة" : "Wishlist"}
                  className="relative"
                  href="/wishlist"
                >
                  <Heart className="w-5 h-5 text-primary" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                      {wishlistCount > 9 ? "9+" : wishlistCount}
                    </span>
                  )}
                </IconButton>

                <Link
                  href="/compare"
                  aria-label={isAr ? "المقارنة" : "Compare"}
                  className="hidden lg:inline-flex relative items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition-all duration-200 hover:border-primary/40 hover:text-primary"
                >
                  <Scale size={15} className="text-primary" />
                  <span className="hidden xl:inline">{isAr ? "مقارنة" : "Compare"}</span>
                  {compareCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                      {compareCount}
                    </span>
                  )}
                </Link>

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
                  <User className="w-5 h-5 text-primary" />
                </IconButton>

                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden rounded-full border border-border bg-card p-2"
                  aria-label={isAr ? "القائمة" : "Menu"}
                  aria-expanded={menuOpen}
                >
                  {menuOpen ? <X className="w-6 h-6 text-primary" /> : <Menu className="w-6 h-6 text-primary" />}
                </button>
              </div>
            </div>

            <div className="hidden md:block">
              <nav
                ref={navTriggerRef}
                className="relative flex items-center justify-center gap-1 py-2.5"
                aria-label={isAr ? "القائمة الرئيسية" : "Main Navigation"}
                onMouseLeave={scheduleClose}
              >
                <ul className="flex items-center gap-0.5" role="menubar">
                  {NAV_ITEMS.map((item) => (
                    <li key={item.id} className="relative" role="none">
                      {item.mega ? (
                        <button
                          type="button"
                          data-mega-trigger={item.mega}
                          role="menuitem"
                          aria-haspopup="true"
                          aria-expanded={activeMenu === item.mega}
                          onMouseEnter={() => {
                            cancelClose();
                            setActiveMenu(item.mega ?? null);
                          }}
                          onClick={() =>
                            item.mega
                              ? setActiveMenu(activeMenu === item.mega ? null : item.mega)
                              : null
                          }
                          className={
                            "relative flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors " +
                            (activeMenu === item.mega
                              ? "text-primary"
                              : "text-muted hover:text-foreground")
                          }
                        >
                          {item.icon && <item.icon size={15} />}
                          <span>{isAr ? item.labelAr : item.labelEn}</span>
                          <ChevronDown size={13} />
                          <span
                            className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-center rounded-full bg-primary transition-transform duration-200 ease-out-smooth"
                            style={{
                              transform: activeMenu === item.mega ? "scaleX(1)" : "scaleX(0)",
                            }}
                          />
                        </button>
                      ) : isRoutinesItem(item) ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            handleRoutinesClick(e);
                            setActiveMenu(null);
                          }}
                          className="relative flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
                        >
                          {item.icon && <item.icon size={15} />}
                          <span>{isAr ? item.labelAr : item.labelEn}</span>
                        </button>
                      ) : isOffersItem(item) ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            handleOffersClick(e);
                            setActiveMenu(null);
                          }}
                          className="relative flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
                        >
                          {item.icon && <item.icon size={15} />}
                          <span>{isAr ? item.labelAr : item.labelEn}</span>
                        </button>
                      ) : isSectionItem(item) ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            handleSectionClick(item.sectionId, e);
                            setActiveMenu(null);
                          }}
                          className="relative flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
                        >
                          {item.icon && <item.icon size={15} />}
                          <span>{isAr ? item.labelAr : item.labelEn}</span>
                        </button>
                      ) : (
                        (() => {
                          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href!);
                          return (
                            <Link
                              href={item.href!}
                              role="menuitem"
                              onClick={() => setActiveMenu(null)}
                              className={`relative flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors ${
                                isActive
                                  ? "text-primary"
                                  : "text-muted hover:text-foreground"
                              }`}
                            >
                              {item.icon && <item.icon size={15} />}
                              <span>{isAr ? item.labelAr : item.labelEn}</span>
                              {isActive && (
                                <span className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-center rounded-full bg-primary" />
                              )}
                            </Link>
                          );
                        })()
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
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon || Sparkles;
                      if (isRoutinesItem(item)) {
                        return (
                          <li key={item.id} role="none">
                            <button
                              type="button"
                              role="menuitem"
                              className="flex w-full items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-accent transition-colors"
                              onClick={() => {
                                handleRoutinesClick();
                                setMenuOpen(false);
                              }}
                            >
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon size={18} />
                              </span>
                              <span>{isAr ? item.labelAr : item.labelEn}</span>
                            </button>
                          </li>
                        );
                      }
                      if (isOffersItem(item)) {
                        return (
                          <li key={item.id} role="none">
                            <Link
                              href="/offers"
                              onClick={() => setMenuOpen(false)}
                              role="menuitem"
                              className="flex w-full items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-accent transition-colors"
                            >
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon size={18} />
                              </span>
                              <span>{isAr ? item.labelAr : item.labelEn}</span>
                            </Link>
                          </li>
                        );
                      }
                      if (isSectionItem(item)) {
                        return (
                          <li key={item.id} role="none">
                            <button
                              type="button"
                              role="menuitem"
                              className="flex w-full items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-accent transition-colors"
                              onClick={() => {
                                handleSectionClick(item.sectionId);
                                setMenuOpen(false);
                              }}
                            >
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon size={18} />
                              </span>
                              <span>{isAr ? item.labelAr : item.labelEn}</span>
                            </button>
                          </li>
                        );
                      }
                      return (
                        <li key={item.id} role="none">
                          <Link
                            href={getMobileHref(item)}
                            role="menuitem"
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                              getMobileHref(item) === "/"
                                ? pathname === "/"
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground hover:bg-accent"
                                : pathname.startsWith(getMobileHref(item))
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground hover:bg-accent"
                            }`}
                            onClick={() => setMenuOpen(false)}
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon size={18} />
                            </span>
                            <span>{isAr ? item.labelAr : item.labelEn}</span>
                          </Link>
                        </li>
                      );
                    })}
                    <li role="none">
                      <Link
                        href="/compare"
                        role="menuitem"
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-foreground hover:bg-accent transition-colors"
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Scale className="w-4.5 h-4.5" />
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

        <ModernMegaMenu
          isOpen={activeMenu !== null}
          activeItem={activeMenu}
          setActiveItem={(item) => setActiveMenu(item)}
          triggerRef={navTriggerRef}
          onPanelMouseEnter={cancelClose}
          onPanelMouseLeave={scheduleClose}
        />
      </div>

      <TrackOrderModal open={trackOpen} onClose={() => setTrackOpen(false)} />

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
