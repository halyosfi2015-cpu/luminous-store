"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { LoadingState } from "@/components/admin/ui/States";
import CategoryForm from "@/components/admin/CategoryForm";
import { applyCategoryOverrides } from "@/src/admin/adapters/local/categories";
import type { CategoryInfo } from "@/src/types/product";

export default function AdminEditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [category, setCategory] = useState<CategoryInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { id } = await params;
      try {
        const res = await fetch("/api/admin/categories");
        const base = (res.ok ? await res.json() : []) as CategoryInfo[];
        const merged = applyCategoryOverrides(base);
        const found = merged.find((c) => c.slug === id) ?? null;
        if (!cancelled) setCategory(found);
      } catch {
        if (!cancelled) setCategory(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  if (!ready) return <LoadingState label="جارٍ تحميل التصنيف..." />;
  if (!category) notFound();

  return <CategoryForm initialCategory={category} />;
}
