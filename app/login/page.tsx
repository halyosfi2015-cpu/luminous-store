"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = await login(email, password);
    if (success) router.push("/account");
    else setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
  };

  return (
    <main dir="rtl" className="min-h-screen bg-background py-12">
      <Container>
        <div className="mx-auto max-w-md">
          <div className="rounded-card border border-border bg-card p-8 shadow-card">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-foreground">تسجيل الدخول</h1>
              <p className="mt-1 text-sm text-muted">مرحباً بعودتك!</p>
            </div>
            {error && (
              <div className="mb-4 rounded-input border border-error-border bg-error-soft p-3 text-sm text-error-fg">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="البريد الإلكتروني"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
              />
              <Input
                label="كلمة المرور"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button type="submit" className="w-full gap-2">
                <LogIn size={16} />
                تسجيل الدخول
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted">
              ليس لديك حساب؟{" "}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                إنشاء حساب
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}
