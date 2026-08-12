import type { Metadata } from "next";
import { getBundleBySlug, bundles } from "@/src/data/bundles";
import BundleDetailClient from "./BundleDetailClient";

export function generateStaticParams() {
  return bundles.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const bundle = getBundleBySlug(slug);
  if (!bundle) return {};
  return {
    title: `${bundle.nameAr} - Luminous Derma`,
    description: bundle.descriptionAr,
    alternates: { canonical: `https://luminousderma.com/bundles/${bundle.slug}` },
  };
}

export default async function BundleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BundleDetailClient slug={slug} />;
}
