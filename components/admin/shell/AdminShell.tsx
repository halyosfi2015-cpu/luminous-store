"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useAdminData } from "@/src/admin/AdminDataProvider";
import { getAdminNavPath } from "@/src/admin/navigation";
import { AccessDeniedState, LoadingState } from "@/components/admin/ui/States";
import AdminLoginForm from "./AdminLoginForm";
import type { AdminResource } from "@/src/admin/types";

export default function AdminShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const pathname = usePathname();
  const { session, loading, can } = useAdminData();

  // The mobile drawer must not stay visually open after navigation.
  // Sidebar links close it via their onClick; browser back/forward is covered
  // by subscribing to history navigation (popstate) and closing in the callback.
  useEffect(() => {
    const onPopState = () => closeSidebar();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [closeSidebar]);

  const trail = getAdminNavPath(pathname);
  const active = trail[trail.length - 1];
  const resource: AdminResource = active?.resource ?? "dashboard";
  const resourceLabel = active?.label;
  const allowed = session !== null && can(resource, "view");

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-muted-bg">
        <main className="p-6">
          <LoadingState label="جارٍ التحقق من الجلسة..." />
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div dir="rtl" className="min-h-screen bg-muted-bg">
        <main className="p-6">
          <AdminLoginForm />
        </main>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-muted-bg">
      <AdminSidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex min-h-screen flex-col lg:pr-64">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">
          {allowed ? (
            children
          ) : (
            <AccessDeniedState resourceLabel={resourceLabel} />
          )}
        </main>
      </div>
    </div>
  );
}
