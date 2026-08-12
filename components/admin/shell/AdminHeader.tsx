"use client";

import Link from "next/link";
import { Menu, ExternalLink, LogOut } from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";
import UserRoleChip from "./UserRoleChip";
import { useAdminData } from "@/src/admin/AdminDataProvider";

export default function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { logout } = useAdminData();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            aria-label="فتح القائمة"
            className="rounded-pill p-2 text-foreground transition-colors hover:bg-muted-bg lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Breadcrumbs />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="hidden items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-primary sm:flex"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            عرض المتجر
          </Link>
          <UserRoleChip />
          <button
            onClick={() => void logout()}
            title="تسجيل الخروج"
            aria-label="تسجيل الخروج"
            className="flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-error"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </div>
    </header>
  );
}
