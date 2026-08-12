import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Store, PlusCircle } from "lucide-react";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import { brands } from "@/lib/content";

export const metadata: Metadata = {
  title: "العلامات التجارية - Luminous Derma",
  description: "اكتشفي أفضل العلامات العالمية للعناية بالبشرة في Luminous Derma — كوس آر إكس، سيرافي، لا روش بوزيه، ذا أورديناري وأكثر",
  alternates: { canonical: "https://luminousderma.com/brands" },
};

export default function BrandsPage() {
  const allProducts = brands.filter((b) => b.name !== "Unknown");

  return (
    <main dir="rtl" className="min-h-screen bg-background py-8">
      <Container>
        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-foreground">
          <Store size={24} className="text-primary" />
          العلامات التجارية
        </h1>
        <p className="mb-8 text-sm text-muted">اكتشفي أفضل العلامات العالمية للعناية بالبشرة</p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allProducts.map((brand) => (
            <Link key={brand.id} href={`/brands/${brand.slug}`}>
              <Card className="flex flex-col items-center gap-4 p-6 text-center transition-shadow hover:shadow-card-hover">
                <div className="relative h-20 w-20 rounded-full bg-muted-bg overflow-hidden">
                  <Image
                    src={brand.logo}
                    alt={brand.nameAr}
                    fill
                    sizes="80px"
                    className="object-contain p-3"
                  />
                </div>
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

          <Link href="/products">
            <Card className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border-strong p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <PlusCircle size={32} className="text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">أخرى</p>
                <p className="mt-1 text-xs text-muted">استعرضي جميع المنتجات المتاحة</p>
              </div>
            </Card>
          </Link>
        </div>
      </Container>
    </main>
  );
}
