"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { User, Address } from "@/types/auth";
import { createBrowserSupabaseClient } from "@/src/lib/supabase";

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, phone: string, password: string) => Promise<boolean>;
  logout: () => void;
  addresses: Address[];
  addAddress: (address: Address) => Promise<void>;
  updateAddress: (address: Address) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
};

type CustomerRow = { id: string; name: string; phone: string; email: string };
type AddressRow = { id: string; label: string; full_name: string; phone: string; city: string; district: string; street: string; building: string; is_default: boolean };

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const supabase = createBrowserSupabaseClient();

  const fetchAddresses = useCallback(async (customerId: string) => {
    const { data } = await supabase
      .from("addresses")
      .select("id, label, full_name, phone, city, district, street, building, is_default")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false });
    if (data) {
      const rows = data as unknown as AddressRow[];
      setAddresses(rows.map((a) => ({
        id: a.id,
        label: a.label ?? "Home",
        fullName: a.full_name ?? "",
        phone: a.phone ?? "",
        city: a.city ?? "",
        district: a.district ?? "",
        street: a.street ?? "",
        building: a.building ?? "",
        isDefault: a.is_default ?? false,
      })));
    }
  }, [supabase]);

  const fetchUserProfile = useCallback(async (authId: string) => {
    const { data } = await supabase
      .from("customers" as never)
      .select("id, name, phone, email")
      .eq("auth_id", authId)
      .single();
    const row = data as unknown as CustomerRow | null;
    if (row) {
      setUser({ id: row.id, name: row.name, email: row.email ?? "", phone: row.phone ?? "" });
      void fetchAddresses(row.id).catch(() => setAddresses([]));
    } else {
      // Fallback: ensure customer via service-role API (bypasses RLS 406/403)
      try {
        const res = await fetch("/api/auth/ensure-customer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        if (res.ok) {
          const j = await res.json();
          if (j.customerId) {
            const { data: retry } = await supabase
              .from("customers" as never)
              .select("id, name, phone, email")
              .eq("auth_id", authId)
              .single();
            const retryRow = retry as unknown as CustomerRow | null;
            if (retryRow) {
              setUser({ id: retryRow.id, name: retryRow.name, email: retryRow.email ?? "", phone: retryRow.phone ?? "" });
              void fetchAddresses(retryRow.id).catch(() => setAddresses([]));
              return;
            }
          }
        }
      } catch {}
      // Last resort: try direct insert (may still fail with RLS, but try)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser && authUser.id === authId) {
        const metaName = (authUser.user_metadata as Record<string, unknown>)?.name as string ?? "";
        const metaPhone = (authUser.user_metadata as Record<string, unknown>)?.phone as string ?? "";
        const metaEmail = authUser.email ?? "";
        const { error: insertErr } = await supabase
          .from("customers" as never)
          .insert({ auth_id: authId, name: metaName, email: metaEmail, phone: metaPhone } as never);
        if (!insertErr) {
          const { data: retry } = await supabase
            .from("customers" as never)
            .select("id, name, phone, email")
            .eq("auth_id", authId)
            .single();
          const retryRow = retry as unknown as CustomerRow | null;
          if (retryRow) {
            setUser({ id: retryRow.id, name: retryRow.name, email: retryRow.email ?? "", phone: retryRow.phone ?? "" });
            fetchAddresses(retryRow.id);
          }
        }
      }
    }
  }, [supabase, fetchAddresses]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: { user: { id: string } } | null } }) => {
      if (session?.user) void fetchUserProfile(session.user.id).catch(() => {
        setUser(null);
        setAddresses([]);
      });
    }).catch(() => {
      setUser(null);
      setAddresses([]);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user: { id: string } } | null) => {
        if (session?.user) void fetchUserProfile(session.user.id).catch(() => {
          setUser(null);
          setAddresses([]);
        });
        else { setUser(null); setAddresses([]); }
      },
    );
    return () => subscription.unsubscribe();
  }, [supabase, fetchUserProfile]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return false;
    await fetchUserProfile(data.user.id);
    return true;
  }, [supabase, fetchUserProfile]);

  const register = useCallback(async (name: string, email: string, phone: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, phone } } });
    if (error || !data.user) return false;
    if (data.session) {
      // Use service-role API to avoid RLS 403
      try {
        await fetch("/api/auth/ensure-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone }),
        });
      } catch {
        // Fallback direct (may fail with RLS, but try)
        await supabase
          .from("customers" as never)
          .insert({ auth_id: data.user.id, name, email, phone } as never);
      }
    }
    await fetchUserProfile(data.user.id);
    return true;
  }, [supabase, fetchUserProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAddresses([]);
  }, [supabase]);

  const addAddress = useCallback(async (address: Address) => {
    if (!user) return;
    if (address.isDefault) {
      await supabase.from("addresses" as never).update({ is_default: false } as never).eq("customer_id", user.id);
    }
    await supabase.from("addresses" as never).insert({
      customer_id: user.id,
      label: address.label,
      full_name: address.fullName,
      phone: address.phone,
      city: address.city,
      district: address.district,
      street: address.street,
      building: address.building,
      is_default: address.isDefault,
    } as never);
    fetchAddresses(user.id);
  }, [user, supabase, fetchAddresses]);

  const updateAddress = useCallback(async (address: Address) => {
    if (!user) return;
    if (address.isDefault) {
      await supabase.from("addresses" as never).update({ is_default: false } as never).eq("customer_id", user.id);
    }
    await supabase.from("addresses" as never).update({
      label: address.label,
      full_name: address.fullName,
      phone: address.phone,
      city: address.city,
      district: address.district,
      street: address.street,
      building: address.building,
      is_default: address.isDefault,
    } as never).eq("id", address.id);
    fetchAddresses(user.id);
  }, [user, supabase, fetchAddresses]);

  const removeAddress = useCallback(async (id: string) => {
    await supabase.from("addresses" as never).delete().eq("id", id);
    if (user) fetchAddresses(user.id);
  }, [user, supabase, fetchAddresses]);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, register, logout, addresses, addAddress, updateAddress, removeAddress }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
