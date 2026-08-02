import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import { brands } from "@/lib/content";

export const metadata: Metadata = {
  title: "العلامات التجارية - Luminous Derma",
  description: "اكتشفي أفضل العلامات العالمية للعناية بالبشرة في Luminous Derma — كوس آر إكس، سيرافي، لا روش بوزيه، ذا أورديناري وأكثر",
};

export default function BrandsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-foreground">
          <Store size={24} className="text-primary" />
          العلامات التجارية
        </h1>
        <p className="mb-8 text-sm text-muted">اكتشفي أفضل العلامات العالمية للعناية بالبشرة</p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Link key={brand.id} href={`/brands/${brand.slug}`}>
              <Card className="flex flex-col items-center gap-4 p-6 text-center transition-shadow hover:shadow-card-hover">
                <div className="h-20 w-20 rounded-full bg-muted-bg overflow-hidden" />
                <div>
                  <p className="text-lg font-semibold text-foreground">{brand.nameAr}</p>
                  <p className="mt-1 text-xs text-muted">{brand.originAr}</p>
                  <p className="mt-2 text-sm text-muted line-clamp-2">{brand.descriptionAr}</p>
                </div>
                {brand.isVerified && (
                  <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success-fg">
                    علامة موثوقة
                  </span>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}
