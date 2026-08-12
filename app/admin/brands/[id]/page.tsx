"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { LoadingState } from "@/components/admin/ui/States";
import BrandForm from "@/components/admin/BrandForm";
import { applyBrandOverrides } from "@/src/admin/adapters/local/brands";
import type { Brand } from "@/src/data/brands";

export default function AdminEditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { id } = await params;
      try {
        const res = await fetch("/api/admin/brands");
        const base = (res.ok ? await res.json() : []) as Brand[];
        const merged = applyBrandOverrides(base);
        const found = merged.find((b) => b.slug === id || b.id === id) ?? null;
        if (!cancelled) setBrand(found);
      } catch {
        if (!cancelled) setBrand(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  if (!ready) return <LoadingState label="جارٍ تحميل العلامة..." />;
  if (!brand) notFound();

  return <BrandForm initialBrand={brand} />;
}
