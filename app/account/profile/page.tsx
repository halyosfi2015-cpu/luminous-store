"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { User, ChevronLeft, Sparkles } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useSkinProfile } from "@/context/SkinProfileContext";
import { skinTypeLabels, skinConcernLabels } from "@/src/data/quiz";

export default function ProfilePage() {
  const { user, isLoggedIn } = useAuth();
  const { profile } = useSkinProfile();

  if (!isLoggedIn) { redirect("/login"); }

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <Link href="/account" className="text-muted transition-colors hover:text-foreground">
              <ChevronLeft size={20} />
            </Link>
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <User size={20} className="text-primary" />
              الملف الشخصي
            </h1>
          </div>

          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted">الاسم</label>
                <p className="text-sm text-foreground">{user?.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">البريد الإلكتروني</label>
                <p className="text-sm text-foreground">{user?.email}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">رقم الجوال</label>
                <p className="text-sm text-foreground">{user?.phone}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-card border border-border bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                <Sparkles size={18} className="text-primary" />
                تحليل البشرة
              </h2>
              <Link href="/quiz">
                <Button variant="outline" size="sm">
                  {profile ? "تعديل" : "إجراء الاختبار"}
                </Button>
              </Link>
            </div>

            {profile ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted">نوع البشرة</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.skinTypes.map((t) => (
                      <span key={t} className="rounded-pill bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                        {skinTypeLabels[t]?.ar}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">الاهتمامات</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.skinConcerns.map((c) => (
                      <span key={c} className="rounded-pill bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary">
                        {skinConcernLabels[c]?.ar}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">آخر تحديث</label>
                  <p className="mt-1 text-sm text-foreground">
                    {new Date(profile.completedAt).toLocaleDateString("ar-YE", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-input bg-muted-bg p-4">
                <p className="text-sm text-muted">
                  لم تجري اختبار تحليل البشرة بعد. خذي دقيقة واحدة لتحصلي على توصيات منتجات مخصصة لبشرتكِ.
                </p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
