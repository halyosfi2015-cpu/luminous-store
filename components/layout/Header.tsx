"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  User,
  ShoppingCart,
  Scale,
  Menu,
  X,
  Truck,
  ChevronDown,
  ChevronLeft,
  LayoutGrid,
  Gift,
  Home,
  Store,
  BadgeCheck,
  Tag,
  Package,
  Layers,
  Wand2,
} from "lucide-react";
import LayoutContainer from "@/components/ui/Container";
import IconButton from "@/components/ui/IconButton";
import SearchTrigger from "@/components/search/SearchTrigger";
import Logo from "@/components/layout/Logo";
import { useCart } from "@/context/CartContext";
import { useCompare } from "@/context/CompareContext";
import { useLang } from "@/lib/use-lang";
import ModernMegaMenu from "@/components/layout/ModernMegaMenu";
import TrackOrderModal from "@/components/layout/TrackOrderModal";
import CategoryAccordion from "@/components/category/CategoryAccordion";
import { categoryTree } from "@/components/layout/navConfig";

type MegaType = "categories";

interface NavItem {
  id: string;
  labelAr: string;
  labelEn: string;
  href?: string;
  mega?: MegaType;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconClass?: string;
  sectionId?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    labelAr: "الرئيسية",
    labelEn: "Home",
    href: "/",
    icon: Home,
    iconClass: "text-primary",
  },
  {
    id: "categories",
    labelAr: "جميع الأقسام",
    labelEn: "All Categories",
    mega: "categories",
    icon: LayoutGrid,
    iconClass: "text-primary",
  },
  {
    id: "offers",
    labelAr: "العروض",
    labelEn: "Offers",
    href: "/offers",
    icon: Tag,
    iconClass: "text-primary",
  },
  {
    id: "bundles",
    labelAr: "باقات وهدايا",
    labelEn: "Bundles & Gifts",
    sectionId: "bundles",
    icon: Gift,
    iconClass: "text-primary",
  },
  {
    id: "services",
    labelAr: "خدماتنا التجميلية",
    labelEn: "Beauty Services",
    href: "/#services",
    icon: Wand2,
    iconClass: "text-primary",
  },
  {
    id: "new-arrivals",
    labelAr: "وصل حديثاً",
    labelEn: "New Arrivals",
    href: "/#new-arrivals",
    icon: Package,
    iconClass: "text-primary",
  },
  {
    id: "routines",
    labelAr: "الروتينات المتكاملة",
    labelEn: "Complete Routines",
    icon: Layers,
    iconClass: "text-primary",
  },
  {
    id: "brands",
    labelAr: "العلامات التجارية",
    labelEn: "Beauty Partners",
    sectionId: "brands",
    icon: Store,
    iconClass: "text-primary",
  },
  {
    id: "experts",
    labelAr: "خبراء موثوقون",
    labelEn: "Trusted Experts",
    sectionId: "experts",
    icon: BadgeCheck,
    iconClass: "text-primary",
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
  const [catsOpen, setCatsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MegaType | null>(null);
  const [trackOpen, setTrackOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) {
      setCatsOpen(false);
      return;
    }
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);
  const { lang } = useLang();
  const { totalItems } = useCart();
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
    // Offers lives as a homepage section — scroll straight to it everywhere.
    handleSectionClick("offers", e);
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
      ? "bg-white/95 sm:backdrop-blur-md shadow-sm border-b border-border"
      : "bg-white border-b border-transparent");

  return (
    <>
      <div data-nav-dropdown className={headerClassName}>
        <div className="relative">
          <LayoutContainer className="relative">
            <div className="flex min-h-[56px] py-1.5 items-center gap-2 flex-wrap sm:min-h-[112px] sm:py-2 sm:gap-4 sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden rounded-full bg-primary p-0 h-10 w-10 min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 order-1 shadow-sm"
                aria-label={isAr ? "القائمة" : "Menu"}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
              </button>
              <div className="flex flex-1 min-w-0 items-center justify-center order-2 sm:order-1 sm:flex-none sm:justify-start">
                <Logo />
              </div>

              <div className="flex min-w-0 items-center justify-center order-3 basis-full sm:order-2 sm:basis-auto sm:flex-1">
                <SearchTrigger className="w-full max-w-xl" />
              </div>

              <div className="flex items-center gap-1.5 shrink-0 order-2 sm:order-3 sm:ms-0">
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
                  className="relative flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-full bg-primary p-0 text-white shadow-card transition-all duration-200 ease-out-smooth hover:bg-primary-light hover:shadow-primary active:scale-95 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2.5 sm:text-sm sm:font-semibold"
                  aria-label={isAr ? "عربة التسوق" : "Shopping Cart"}
                >
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    {totalItems > 0 && (
                      <span key={totalItems} className="animate-badge-pop absolute -top-1.5 -end-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                        {totalItems > 9 ? "9+" : totalItems}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline">{isAr ? "السلة" : "Cart"}</span>
                </Link>

                <IconButton
                  variant="ghost"
                  aria-label={isAr ? "الحساب" : "Account"}
                  className="relative hidden sm:inline-flex"
                  href="/account"
                >
                  <User className="w-5 h-5 text-primary" />
                </IconButton>

              </div>
            </div>

            <div className="hidden md:block">
              <nav
                ref={navTriggerRef}
                className="relative flex items-center justify-center gap-1 border-b border-primary/10 py-1.5"
                aria-label={isAr ? "القائمة الرئيسية" : "Main Navigation"}
                onMouseLeave={scheduleClose}
              >
                <ul className="flex items-center justify-center gap-x-1 gap-y-0.5" role="menubar">
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
                            "luminous-nav-item relative flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold tracking-wide whitespace-nowrap transition-all duration-300 " +
                             (activeMenu === item.mega
                               ? "text-primary bg-primary-50"
                               : "text-gray-700 hover:text-primary hover:bg-primary-50/60")
                          }
                        >
                          {item.icon && <item.icon size={15} className={activeMenu === item.mega ? "text-primary" : "text-primary/70"} />}
                          <span className="whitespace-nowrap">{isAr ? item.labelAr : item.labelEn}</span>
                          <ChevronDown size={12} className={`transition-transform duration-300 ${activeMenu === item.mega ? "rotate-180 text-primary" : "text-gray-400"}`} />
                          <span className="luminous-nav-underline" aria-hidden="true" />
                        </button>
                      ) : isRoutinesItem(item) ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            handleRoutinesClick(e);
                            setActiveMenu(null);
                          }}
                          className="luminous-nav-item relative flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold tracking-wide whitespace-nowrap text-gray-700 transition-all duration-300 hover:text-primary hover:bg-primary-50/60"
                        >
                          {item.icon && <item.icon size={15} className="text-primary/70" />}
                          <span className="whitespace-nowrap">{isAr ? item.labelAr : item.labelEn}</span>
                          <span className="luminous-nav-underline" aria-hidden="true" />
                        </button>
                      ) : isOffersItem(item) ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            handleOffersClick(e);
                            setActiveMenu(null);
                          }}
                          className="luminous-nav-item relative flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold tracking-wide whitespace-nowrap text-gray-700 transition-all duration-300 hover:text-primary hover:bg-primary-50/60"
                        >
                          {item.icon && <item.icon size={15} className="text-primary/70" />}
                          <span className="whitespace-nowrap">{isAr ? item.labelAr : item.labelEn}</span>
                          <span className="luminous-nav-underline" aria-hidden="true" />
                        </button>
                      ) : isSectionItem(item) ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            handleSectionClick(item.sectionId, e);
                            setActiveMenu(null);
                          }}
                          className="luminous-nav-item relative flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold tracking-wide whitespace-nowrap text-gray-700 transition-all duration-300 hover:text-primary hover:bg-primary-50/60"
                        >
                          {item.icon && <item.icon size={15} className="text-primary/70" />}
                          <span className="whitespace-nowrap">{isAr ? item.labelAr : item.labelEn}</span>
                          <span className="luminous-nav-underline" aria-hidden="true" />
                        </button>
                      ) : (
                        (() => {
                          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href!);
                          return (
                            <Link
                              href={item.href!}
                              role="menuitem"
                              onClick={() => setActiveMenu(null)}
                              className={`luminous-nav-item relative flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold tracking-wide whitespace-nowrap transition-all duration-300 ${
                                isActive
                                  ? "text-primary bg-primary-50"
                                  : "text-gray-700 hover:text-primary hover:bg-primary-50/60"
                              }`}
                            >
                              {item.icon && <item.icon size={15} className={isActive ? "text-primary" : "text-primary/70"} />}
                              <span className="whitespace-nowrap">{isAr ? item.labelAr : item.labelEn}</span>
                              {isActive ? (
                                <span className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-accent to-accent-light" />
                              ) : (
                                <span className="luminous-nav-underline" aria-hidden="true" />
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
              <>
                <button
                  type="button"
                  aria-label={isAr ? "إغلاق القائمة" : "Close menu"}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-[75] bg-black/40 backdrop-blur-[2px] md:hidden"
                />
                <div role="dialog" aria-modal="true" className="fixed inset-y-0 right-0 z-[80] flex w-[70vw] max-w-[270px] flex-col bg-white shadow-2xl animate-drawer-in md:hidden">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <span className="text-sm font-bold text-primary">
                      {isAr ? "القائمة الرئيسية" : "Main Menu"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMenuOpen(false)}
                      aria-label={isAr ? "إغلاق القائمة" : "Close menu"}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <nav className="flex-1 overflow-y-auto overscroll-contain p-2 [&_svg]:size-3.5" aria-label={isAr ? "القائمة الجانبية" : "Mobile Menu"}>
{catsOpen ? (
<div>
                <button
                  type="button"
                  onClick={() => setCatsOpen(false)}
                  className="mb-3 flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
                >
                  <ChevronLeft size={18} className={isAr ? "rotate-180" : ""} />
                  {isAr ? "رجوع للقائمة" : "Back to menu"}
                </button>
                <div>
                  <CategoryAccordion tree={categoryTree} onNavigate={() => setMenuOpen(false)} />
                </div>
</div>
) : (
<ul className="flex flex-col gap-1" role="menu">
                <li role="none">
                  <Link
                    href="/"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="order-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Home size={18} />
                    </span>
                    <span className="order-2 flex-1 text-start">{isAr ? "الرئيسية" : "Home"}</span>
                  </Link>
                </li>
                <li role="none">
                  <button
                    type="button"
                    onClick={() => setCatsOpen(true)}
                    role="menuitem"
                    className="flex w-full items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="order-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <LayoutGrid size={18} />
                    </span>
                    <span className="order-2 flex-1 text-start">{isAr ? "جميع الأقسام" : "All Categories"}</span>
                    <ChevronLeft size={18} className="order-3 shrink-0 text-primary" />
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); setTrackOpen(true); }}
                    role="menuitem"
                    className="flex w-full items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="order-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Truck size={18} />
                    </span>
                    <span className="order-2 flex-1 text-start">{isAr ? "تتبع الطلب" : "Track Order"}</span>
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    onClick={(e) => { setMenuOpen(false); handleSectionClick("offers", e); }}
                    role="menuitem"
                    className="flex w-full items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="order-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Tag size={18} />
                    </span>
                    <span className="order-2 flex-1 text-start">{isAr ? "العروض" : "Offers"}</span>
                  </button>
                </li>
                <li role="none">
                  <Link
                    href="/brands"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="order-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Store size={18} />
                    </span>
                    <span className="order-2 flex-1 text-start">{isAr ? "الماركات" : "Brands"}</span>
                  </Link>
                </li>
                <li role="none">
                  <Link
                    href="/routines"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="order-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Layers size={18} />
                    </span>
                    <span className="order-2 flex-1 text-start">{isAr ? "الروتينات" : "Routines"}</span>
                  </Link>
                </li>
                <li role="none">
                  <Link
                    href="/bundles"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="order-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Gift size={18} />
                    </span>
                    <span className="order-2 flex-1 text-start">{isAr ? "باقات وهدايا" : "Bundles & Gifts"}</span>
                  </Link>
                </li>
                <li role="none">
                  <Link
                    href="/new-arrivals"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="order-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Package size={18} />
                    </span>
                    <span className="order-2 flex-1 text-start">{isAr ? "وصل حديثاً" : "New Arrivals"}</span>
                  </Link>
                </li>
                <li role="none">
                  <Link
                    href="/experts"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="order-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <BadgeCheck size={18} />
                    </span>
                    <span className="order-2 flex-1 text-start">{isAr ? "الخبراء" : "Experts"}</span>
                  </Link>
                </li>
                <li role="none">
                  <Link
                    href="/#services"
                    onClick={() => setMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <span className="order-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Wand2 size={18} />
                    </span>
                    <span className="order-2 flex-1 text-start">{isAr ? "خدماتنا" : "Services"}</span>
                  </Link>
                </li>
</ul>
)}
            </nav>
          </div>
        </>
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
        @keyframes drawer-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-drawer-in { animation: drawer-in 220ms cubic-bezier(0.22,1,0.36,1); }
        @keyframes badge-pop {
          0% { transform: scale(0.4); }
          60% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        .animate-badge-pop { animation: badge-pop 300ms ease-out; }
        .luminous-nav-underline {
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: calc(100% - 1.5rem);
          height: 2px;
          border-radius: 9999px;
          background: linear-gradient(90deg, var(--accent, #d4af37), var(--accent-light, #F7D98C));
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }
        .luminous-nav-item:hover .luminous-nav-underline,
        .luminous-nav-item:focus-visible .luminous-nav-underline {
          transform: translateX(-50%) scaleX(1);
        }
        .luminous-nav-item {
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .luminous-nav-item:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </>
  );
}
