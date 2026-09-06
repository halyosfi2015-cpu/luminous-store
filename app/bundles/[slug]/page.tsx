import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BundleDetailClient from "./BundleDetailClient";
import { createPublicSupabaseClient } from "@/src/lib/supabase-server";

type DbBundle = {
  id: string; slug: string; name_en?: string | null; name_ar?: string | null;
  description?: string | null; description_ar?: string | null;
  is_active?: boolean | null;
};

export const dynamic = "force-dynamic";

async function getBundleSlug(slug: string): Promise<boolean> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("bundles")
      .select("slug")
      .eq("slug", slug)
      .eq("is_active", true)
      .limit(1);
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const exists = await getBundleSlug(slug);
  if (!exists) return {};
  return {
    title: `${slug} - Luminous Derma`,
    alternates: { canonical: `https://luminousderma.com/bundles/${slug}` },
  };
}

export default async function BundleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exists = await getBundleSlug(slug);
  if (!exists) notFound();
  return <BundleDetailClient slug={slug} />;
}
