"use client";

import { useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAdminData } from "@/src/admin/AdminDataProvider";

export default function AdminLoginForm() {
  const { login } = useAdminData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.ok) setError(result.error ?? "تعذر تسجيل الدخول");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-12">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ShieldCheck className="h-8 w-8" />
      </span>
      <div className="w-full rounded-card border border-border bg-card p-8 shadow-card">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">تسجيل دخول المشرفين</h1>
          <p className="mt-1 text-sm text-muted">
            تسجيل الدخول بحساب Supabase مع صلاحية إدارة
          </p>
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
            placeholder="admin@example.com"
            autoComplete="email"
          />
          <Input
            label="كلمة المرور"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <Button type="submit" loading={submitting} disabled={submitting} className="w-full gap-2">
            <LogIn size={16} />
            تسجيل الدخول
          </Button>
        </form>
      </div>
    </div>
  );
}
