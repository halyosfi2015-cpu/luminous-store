import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import { experts } from "@/lib/content";
import { getExpertImage } from "@/lib/expert-images";

export const metadata: Metadata = {
  title: "خبراء الجلدية - Luminous Derma",
  description: "تعرفي على فريقنا من أطباء الجلدية المتخصصين في Luminous Derma — استشاري خبراء العناية بالبشرة",
  alternates: { canonical: "https://luminousderma.com/experts" },
};

export default function ExpertsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-foreground">
          <Stethoscope size={24} className="text-primary" />
          خبراء الجلدية
        </h1>
        <p className="mb-8 text-sm text-muted">تعرفي على فريقنا من أطباء الجلدية المتخصصين</p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {experts.map((expert) => (
            <Link key={expert.id} href={`/experts/${expert.slug}`}>
              <Card className="flex flex-col items-center gap-4 p-6 text-center transition-shadow hover:shadow-card-hover">
                <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted-bg">
                  <Image
                    src={getExpertImage(expert)}
                    alt={expert.nameAr}
                    width={96}
                    height={96}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{expert.nameAr}</p>
                  <p className="text-sm text-primary">{expert.titleAr}</p>
                  <p className="mt-2 text-sm text-muted line-clamp-2">{expert.bioAr}</p>
                  <p className="mt-2 text-xs text-muted">{expert.yearsOfExperience}+ سنة خبرة</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}
