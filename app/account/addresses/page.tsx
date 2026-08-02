"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, ChevronLeft, Trash2 } from "lucide-react";
import Container from "@/components/ui/Container";
import { useAuth } from "@/context/AuthContext";

export default function AddressesPage() {
  const { isLoggedIn, addresses, removeAddress } = useAuth();

  if (!isLoggedIn) { redirect("/login"); }

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/account" className="text-muted transition-colors hover:text-foreground">
                <ChevronLeft size={20} />
              </Link>
              <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <MapPin size={20} className="text-primary" />
                العناوين
              </h1>
            </div>
          </div>

          {addresses.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <MapPin size={48} className="text-border-strong" />
              <p className="text-muted">لا توجد عناوين</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {addresses.map((addr) => (
                <div key={addr.id} className="rounded-card border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                            افتراضي
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {addr.fullName} — {addr.phone}
                      </p>
                      <p className="text-xs text-muted">
                        {addr.city}، {addr.district}، {addr.street}، {addr.building}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="حذف"
                      onClick={() => removeAddress(addr.id)}
                      className="text-muted transition-colors hover:text-error"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
