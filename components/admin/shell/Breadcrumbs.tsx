"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, LayoutDashboard } from "lucide-react";
import { getAdminNavPath } from "@/src/admin/navigation";

export default function Breadcrumbs() {
  const pathname = usePathname();
  // The dashboard itself is already rendered as the leading "لوحة التحكم" crumb,
  // so it is never repeated as an extra trailing item on /admin.
  const trail = getAdminNavPath(pathname).filter((item) => item.href !== "/admin");

  if (trail.length === 0) {
    return (
      <nav aria-label="مسار التنقل" className="flex min-w-0 items-center gap-1.5 text-xs">
        <span className="flex items-center gap-1 font-medium text-foreground">
          <LayoutDashboard className="h-3.5 w-3.5" />
          لوحة التحكم
        </span>
      </nav>
    );
  }

  return (
    <nav aria-label="مسار التنقل" className="flex min-w-0 items-center gap-1.5 text-xs">
      <Link
        href="/admin"
        className="whitespace-nowrap text-muted transition-colors hover:text-primary"
      >
        لوحة التحكم
      </Link>
      {trail.map((item, index) => {
        const isLast = index === trail.length - 1;
        return (
          <span key={item.labelEn} className="flex min-w-0 items-center gap-1.5">
            <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-muted/60" />
            {!isLast && item.href ? (
              <Link
                href={item.href}
                className="whitespace-nowrap text-muted transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate font-medium text-foreground">{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}