import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { experts } from "@/lib/content";
import ExpertDetailClient from "@/components/experts/ExpertDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const expert = experts.find((e) => e.slug === slug);
  if (!expert) return {};
  return {
    title: expert.nameAr,
    description: expert.bioAr,
    alternates: { canonical: `https://luminousderma.com/experts/${expert.slug}` },
  };
}

export default async function ExpertDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const expert = experts.find((e) => e.slug === slug);
  if (!expert) notFound();

  return <ExpertDetailClient expert={expert} />;
}
