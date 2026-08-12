"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { LoadingState } from "@/components/admin/ui/States";
import ProductForm from "@/components/admin/ProductForm";
import { applyProductOverrides } from "@/src/admin/adapters/local/products";
import type { Product } from "@/src/types/product";

export default function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { id } = await params;
      try {
        const res = await fetch("/api/admin/products");
        const base = (res.ok ? await res.json() : []) as Product[];
        const merged = applyProductOverrides(base);
        const found = merged.find((p) => p.id === id || p.slug === id) ?? null;
        if (!cancelled) setProduct(found);
      } catch {
        if (!cancelled) setProduct(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  if (!ready) return <LoadingState label="جارٍ تحميل المنتج..." />;
  if (!product) notFound();

  return <ProductForm initialProduct={product} />;
}
