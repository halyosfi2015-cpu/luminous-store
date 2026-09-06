"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { useAdminData } from "@/src/admin/AdminDataProvider";
import {
  adminNavigation,
  isAdminNavPathActive,
  type AdminNavItem,
} from "@/src/admin/navigation";

type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
};

function initialOpenGroups(pathname: string): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const item of adminNavigation) {
    if (item.children && item.children.some((child) => isAdminNavPathActive(pathname, child.href))) {
      result[item.labelEn] = true;
    }
  }
  return result;
}

export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { can } = useAdminData();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    initialOpenGroups(pathname),
  );

  const mobileDrawerRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const visibleItems = adminNavigation
    .map((item) => {
      if (item.children) {
        const children = item.children.filter(
          (child) => !child.resource || can(child.resource, "view"),
        );
        return { ...item, children };
      }
      return item;
    })
    .filter((item) => {
      if (item.children) return item.children.length > 0;
      return item.resource ? can(item.resource, "view") : true;
    });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // While the mobile drawer is open: Escape closes it, the background is
  // prevented from scrolling, focus moves into the drawer (restored to the
  // opening trigger on close), so keyboard users stay inside the navigation.
  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const drawer = mobileDrawerRef.current;
    if (drawer) {
      const first = drawer.querySelector<HTMLElement>(
        "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      (first ?? drawer).focus();
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      const restoreTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus();
      }
    };
  }, [open]);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Link href="/admin" onClick={onClose} className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-white">
            L
          </span>
          <div className="leading-tight">
            <span className="block text-sm font-bold text-foreground">Luminous Derma</span>
            <span className="block text-[11px] text-muted">لوحة التحكم</span>
          </div>
        </Link>
        <button
          onClick={onClose}
          aria-label="إغلاق القائمة"
          className="rounded-pill p-1.5 text-muted transition-colors hover:bg-muted-bg hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            if (item.children) {
              const isOpen = openGroups[item.labelEn] ?? false;
              return (
                <li key={item.labelEn}>
                  <button
                    onClick={() => {
                      if (item.href) {
                        window.location.assign(item.href);
                        return;
                      }
                      toggleGroup(item.labelEn);
                    }}
                    aria-expanded={isOpen}
                    aria-controls={`admin-group-${item.labelEn}`}
                    className={`
                      flex w-full items-center justify-between gap-3 rounded-card px-3 py-2.5 text-sm font-medium
                      transition-colors hover:bg-muted-bg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset
                      ${Icon ? "text-foreground" : "text-muted"}
                    `}
                  >
                    <span className="flex items-center gap-3">
                      {Icon && <Icon className="h-[18px] w-[18px] text-muted" />}
                      <span>{item.label}</span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <ul id={`admin-group-${item.labelEn}`} className="mt-1 space-y-1 border-r-2 border-border ps-3">
                      {item.children.map((child) => (
                        <SidebarLink key={child.labelEn} item={child} pathname={pathname} onNavigate={onClose} nested />
                      ))}
                    </ul>
                  )}
                </li>
              );
            }
            return (
              <li key={item.labelEn}>
                <SidebarLink item={item} pathname={pathname} onNavigate={onClose} />
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-5 py-3 text-[11px] text-muted">
        Luminous Control Center — متصل بقاعدة البيانات
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 lg:block">
        {sidebarContent}
      </aside>

      <div className={`lg:hidden ${open ? "" : "pointer-events-none"}`}>
        <div
          className={`fixed inset-0 z-40 bg-neutral-950/50 backdrop-blur-sm transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={onClose}
          aria-hidden
        />
        <aside
          ref={mobileDrawerRef}
          inert={!open}
          aria-label="التنقل الإداري"
          className={`fixed inset-y-0 right-0 z-50 w-72 transform-gpu transition-transform duration-300 ease-out-smooth ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}

function SidebarLink({
  item,
  pathname,
  onNavigate,
  nested = false,
}: {
  item: AdminNavItem;
  pathname: string;
  onNavigate: () => void;
  nested?: boolean;
}) {
  const Icon = item.icon;
  const active = isAdminNavPathActive(pathname, item.href);
  return (
    <Link
      href={item.href ?? "#"}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`
        flex items-center gap-3 rounded-card px-3 py-2.5 text-sm transition-colors
        ${active ? "bg-primary text-white shadow-card" : "text-foreground hover:bg-muted-bg"}
        ${nested ? "py-2" : ""}
      `}
    >
      {Icon && <Icon className={`h-[18px] w-[18px] ${active ? "text-white" : "text-muted"}`} />}
      <span>{item.label}</span>
    </Link>
  );
}
