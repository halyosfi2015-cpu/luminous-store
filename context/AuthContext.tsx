"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { User, Address } from "@/types/auth";

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, phone: string, password: string) => Promise<boolean>;
  logout: () => void;
  addresses: Address[];
  addAddress: (address: Address) => void;
  updateAddress: (address: Address) => void;
  removeAddress: (id: string) => void;
};

const USER_KEY = "luminous-user";
const ADDRESS_KEY = "luminous-addresses";
const REGISTERED_KEY = "luminous-registered-users";

function loadFromStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadFromStorage<User>(USER_KEY));
  const [addresses, setAddresses] = useState<Address[]>(() => loadFromStorage<Address[]>(ADDRESS_KEY) || []);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  useEffect(() => {
    if (!initialized.current) return;
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(addresses));
  }, [addresses]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const stored = localStorage.getItem(REGISTERED_KEY);
    let users: { name: string; email: string; phone: string; password: string }[] = [];
    if (stored) users = JSON.parse(stored);
    const found = users.find((u) => u.email === email && u.password === password);
    if (found) {
      setUser({ id: "u1", name: found.name, email: found.email, phone: found.phone });
      return true;
    }
    return false;
  }, []);

  const register = useCallback(async (name: string, email: string, phone: string, password: string): Promise<boolean> => {
    const stored = localStorage.getItem(REGISTERED_KEY);
    let users: { name: string; email: string; phone: string; password: string }[] = [];
    if (stored) users = JSON.parse(stored);
    if (users.some((u) => u.email === email)) return false;
    users.push({ name, email, phone, password });
    localStorage.setItem(REGISTERED_KEY, JSON.stringify(users));
    setUser({ id: "u1", name, email, phone });
    return true;
  }, []);

  const logout = useCallback(() => { setUser(null); }, []);

  const addAddress = useCallback((address: Address) => {
    setAddresses((prev) => {
      const updated = address.isDefault
        ? prev.map((a) => ({ ...a, isDefault: false })).concat(address)
        : [...prev, address];
      return updated;
    });
  }, []);

  const updateAddress = useCallback((address: Address) => {
    setAddresses((prev) =>
      prev.map((a) => (a.id === address.id ? address : { ...a, isDefault: address.isDefault ? false : a.isDefault }))
    );
  }, []);

  const removeAddress = useCallback((id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }, []);

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
