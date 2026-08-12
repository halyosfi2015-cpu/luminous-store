"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AdminPermission, AdminResource, AdminRole, AdminSession } from "./types";
import { can as hasRolePermission } from "./permissions";
import { localAdapters } from "./adapters/local";
import * as services from "./services";
import { createBrowserSupabaseClient } from "@/src/lib/supabase";

export type AdminUserRecord = {
  id: string;
  authId: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
};

type AdminDataContextValue = {
  session: AdminSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  previewRole: (role: AdminRole, name?: string, email?: string) => void;
  can: (resource: AdminResource, permission: AdminPermission) => boolean;
  services: typeof services;
  adapters: typeof localAdapters;
};

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

/**
 * Admin session resolution.
 * A real Supabase Auth session alone is NOT sufficient: the authenticated user
 * must also match an ACTIVE admin_users record (auth_id === auth.users.id).
 * Resolution happens server-side via GET /api/admin/me (requireAdmin), so the
 * client never reads admin_users directly and RLS stays intact.
 */
async function resolveAdminSession(authEmail: string | undefined) {
  const res = await fetch("/api/admin/me", { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const admin: AdminUserRecord | undefined = json?.admin;
  if (!admin || !admin.isActive) return null;
  return {
    role: admin.role,
    name: admin.name,
    email: authEmail ?? "",
    loggedInAt: new Date().toISOString(),
  } as AdminSession;
}

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createBrowserSupabaseClient());

  useEffect(() => {
    let disposed = false;

    async function restore() {
      try {
        const { data } = await supabase.auth.getSession();
        const authUser = data.session?.user;
        if (disposed || !authUser) {
          setSession(null);
          return;
        }
        const resolved = await resolveAdminSession(authUser.email);
        if (disposed) return;
        setSession(resolved);
      } catch {
        if (!disposed) setSession(null);
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    void restore();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (disposed) return;
      if (!authSession?.user) {
        setSession(null);
        return;
      }
      void resolveAdminSession(authSession.user.email).then((resolved) => {
        if (!disposed) setSession(resolved);
      });
    });

    return () => {
      disposed = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };

      const { data } = await supabase.auth.getSession();
      const authUser = data.session?.user;
      const resolved = await resolveAdminSession(authUser?.email);
      if (!resolved) {
        // Authenticated as a Supabase user but NOT an active admin → sign out.
        await supabase.auth.signOut();
        setSession(null);
        return { ok: false, error: "هذا الحساب ليس مشرفاً في لوحة التحكم" };
      }
      setSession(resolved);
      return { ok: true };
    },
    [supabase],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, [supabase]);

  const previewRole = useCallback(
    (role: AdminRole, name?: string, email?: string) => {
      // Role preview is only meaningful on top of a real authenticated session.
      if (!session) return;
      setSession({
        role,
        name: name ?? session.name,
        email: email ?? session.email,
        loggedInAt: new Date().toISOString(),
      });
    },
    [session],
  );

  const can = useCallback(
    (resource: AdminResource, permission: AdminPermission) =>
      session ? hasRolePermission(session.role, resource, permission) : false,
    [session],
  );

  const value = useMemo<AdminDataContextValue>(
    () => ({ session, loading, login, logout, previewRole, can, services, adapters: localAdapters }),
    [session, loading, login, logout, previewRole, can],
  );

  return (
    <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
  );
}

export function useAdminData(): AdminDataContextValue {
  const ctx = useContext(AdminDataContext);
  if (!ctx) {
    throw new Error("useAdminData must be used within AdminDataProvider");
  }
  return ctx;
}
