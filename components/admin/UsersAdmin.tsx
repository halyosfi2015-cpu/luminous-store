"use client";

import { useMemo } from "react";
import { ShieldCheck, UserCog, Pencil, Eye } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAdminData } from "@/src/admin/AdminDataProvider";
import {
  ROLE_RESOURCE_PERMISSIONS,
  ALL_ADMIN_RESOURCES,
} from "@/src/admin/permissions";
import { ADMIN_ROLE_LABELS } from "@/src/admin/navigation";
import type { AdminRole } from "@/src/admin/types";

const ROLES: AdminRole[] = [
  "super_admin",
  "admin",
  "content_manager",
  "product_manager",
  "order_manager",
  "support",
];

export default function UsersAdmin() {
  const { session, previewRole } = useAdminData();

  const roleSummary = useMemo(
    () =>
      ROLES.map((role) => {
        const permissions = ROLE_RESOURCE_PERMISSIONS[role];
        const editable = ALL_ADMIN_RESOURCES.filter((resource) =>
          permissions[resource].includes("edit"),
        );
        const viewOnly = ALL_ADMIN_RESOURCES.filter(
          (resource) =>
            permissions[resource].includes("view") &&
            !permissions[resource].includes("edit"),
        );
        return { role, editable, viewOnly };
      }),
    [],
  );

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">المستخدمون والأدوار</h1>
        <p className="mt-1 text-sm text-muted">
          إدارة أدوار المشرفين وصلاحياتهم — مبني على نظام الصلاحيات الموجود في المشروع
        </p>
      </div>

      <Card padding="md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2 font-bold text-foreground">
                {session.name}
                <Badge variant="primary">{ADMIN_ROLE_LABELS[session.role]}</Badge>
              </div>
              <div className="mt-0.5 text-sm text-muted" dir="ltr">
                {session.email}
              </div>
              <div className="mt-1 text-xs text-muted">
                تسجيل الدخول: {new Date(session.loggedInAt).toLocaleString("ar-YE")}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">تبديل الدور (معاينة):</span>
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => previewRole(role)}
                className={`rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors ${
                  session.role === role
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-muted hover:border-primary/40"
                }`}
              >
                {ADMIN_ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {roleSummary.map(({ role, editable, viewOnly }) => (
          <Card key={role} padding="md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserCog className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-bold text-foreground">
                    {ADMIN_ROLE_LABELS[role]}
                  </h2>
                  <span dir="ltr" className="text-xs text-muted">{role}</span>
                </div>
              </div>
              {session.role === role && <Badge variant="primary">الدور الحالي</Badge>}
            </div>

            {editable.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-success-fg">
                  <Pencil className="h-3.5 w-3.5" />
                  صلاحية التعديل
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {editable.map((resource) => (
                    <Badge key={resource} variant="success">{resource}</Badge>
                  ))}
                </div>
              </div>
            )}

            {viewOnly.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <Eye className="h-3.5 w-3.5" />
                  عرض فقط
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {viewOnly.map((resource) => (
                    <Badge key={resource} variant="neutral">{resource}</Badge>
                  ))}
                </div>
              </div>
            )}

            {editable.length === 0 && viewOnly.length === 0 && (
              <p className="mt-4 text-sm text-muted">لا صلاحيات لهذا الدور حالياً.</p>
            )}
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          variant="danger"
          onClick={() => previewRole("super_admin", session.name, session.email)}
        >
          إعادة تعيين إلى مشرف عام
        </Button>
      </div>
    </div>
  );
}
