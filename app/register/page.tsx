"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    const success = await register(name, email, phone, password);
    if (success) router.push("/account");
    else setError("البريد الإلكتروني مسجل بالفعل");
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background py-12">
      <Container>
        <div className="mx-auto max-w-md">
          <div className="rounded-card border border-border bg-card p-8 shadow-card">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-foreground">إنشاء حساب</h1>
              <p className="mt-1 text-sm text-muted">انضمي إلى Luminous Derma</p>
            </div>
            {error && (
              <div className="mb-4 rounded-input border border-error-border bg-error-soft p-3 text-sm text-error-fg">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="الاسم الكامل"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              <Input
                label="البريد الإلكتروني"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <Input
                label="رقم الجوال"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
              />
              <Input
                label="كلمة المرور"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Button type="submit" className="w-full gap-2">
                <UserPlus size={16} />
                إنشاء حساب
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted">
              لديك حساب؟{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
