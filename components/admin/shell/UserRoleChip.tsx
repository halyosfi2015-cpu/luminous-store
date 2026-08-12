"use client";

import { useAdminData } from "@/src/admin/AdminDataProvider";
import { ADMIN_ROLE_LABELS } from "@/src/admin/navigation";

export default function UserRoleChip() {
  const { session } = useAdminData();

  if (!session) {
    return (
      <span className="rounded-pill bg-muted-bg px-3 py-1.5 text-xs font-medium text-muted">
        غير مسجل
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-pill border border-border bg-card px-3 py-1.5 shadow-card">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {session.name.trim().charAt(0) || "؟"}
      </span>
      <div className="hidden flex-col leading-tight sm:flex">
        <span className="text-xs font-bold text-foreground">{session.name}</span>
        <span className="text-[11px] text-muted">
          {ADMIN_ROLE_LABELS[session.role] ?? session.role}
        </span>
      </div>
    </div>
  );
}
