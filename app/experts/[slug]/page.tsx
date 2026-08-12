import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Award, BadgeCheck } from "lucide-react";
import Container from "@/components/ui/Container";
import { experts } from "@/lib/content";
import { getExpertImage } from "@/lib/expert-images";

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

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <div className="mb-6">
          <Link href="/experts" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-primary">
            <ChevronRight size={16} />
            الخبراء
          </Link>
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-card bg-card shadow-card">
            <div className="h-32 bg-gradient-to-l from-primary/15 to-secondary-200/40" />
            <div className="relative px-6 pb-6">
              <div className="absolute -top-12 right-6 h-24 w-24 rounded-full border-4 border-card bg-card shadow-card overflow-hidden">
                <Image
                  src={getExpertImage(expert)}
                  alt={expert.nameAr}
                  width={96}
                  height={96}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="pt-14">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{expert.nameAr}</h1>
                  {expert.isVerified && <BadgeCheck size={20} className="text-primary" />}
                </div>
                <p className="mt-1 text-primary">{expert.titleAr}</p>
                <p className="mt-1 text-sm text-muted">{expert.yearsOfExperience}+ سنة خبرة</p>
                <p className="mt-4 text-sm leading-relaxed text-muted">{expert.bioAr}</p>

                <div className="mt-6">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Award size={16} className="text-primary" />
                    التخصصات
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {expert.specialtiesAr.map((s) => (
                      <span key={s} className="rounded-full bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
