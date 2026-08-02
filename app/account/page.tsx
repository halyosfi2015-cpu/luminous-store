"use client";

import Link from "next/link";
import { redirect, useRouter } from "next/navigation";
import { User, Package, MapPin, LogOut, ChevronLeft, Sparkles, Gift } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

const links = [
  { href: "/account/orders", icon: Package, label: "طلباتي" },
  { href: "/account/addresses", icon: MapPin, label: "العناوين" },
  { href: "/account/profile", icon: User, label: "الملف الشخصي" },
  { href: "/quiz", icon: Sparkles, label: "اختبار تحليل البشرة" },
  { href: "/rewards", icon: Gift, label: "برنامج المكافآت" },
];

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuth();

  if (!isLoggedIn) {
    redirect("/login");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mx-auto max-w-lg">
          <div className="mb-6 rounded-card border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/5">
                <User size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{user?.name}</p>
                <p className="text-sm text-muted">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-4 rounded-card border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/20"
              >
                <link.icon size={20} className="text-primary" />
                <span className="flex-1 text-sm font-medium text-foreground">{link.label}</span>
                <ChevronLeft size={18} className="text-muted" />
              </Link>
            ))}
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full gap-2 border-error-border text-error-fg hover:bg-error-soft"
              onClick={() => { logout(); router.push("/"); }}
            >
              <LogOut size={16} />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </Container>
    </main>
  );
}
