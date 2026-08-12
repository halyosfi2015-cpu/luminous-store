"use client";

import { useMemo } from "react";
import { useAdminData } from "./AdminDataProvider";
import type { AdminResource } from "./types";

export function useAdminGuard(resource: AdminResource) {
  const { session, can } = useAdminData();

  return useMemo(() => {
    const hasView = can(resource, "view");
    const hasEdit = can(resource, "edit");
    return {
      isAuthenticated: session !== null,
      allowed: session !== null && hasView,
      canEdit: session !== null && hasEdit,
      session,
    };
  }, [session, can, resource]);
}
