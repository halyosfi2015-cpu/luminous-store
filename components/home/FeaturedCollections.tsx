import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sparkles } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import { routines, products } from "@/lib/products";

const collectionGradients = [
  "from-primary-100 to-secondary-100",
  "from-secondary-100 to-primary-50",
  "from-accent-50 to-secondary-100",
];

export default function FeaturedCollections() {
  return (
    <section className="w-full bg-background py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionTitle
          eyebrow="روتينات متكاملة"
          title="مجموعات مميزة"
          subtitle="روتينات عناية متكاملة اختارها الخبراء لاحتياجاتك المتنوعة"
          action={
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              تصفحي المنتجات
              <ArrowLeft size={15} className="transition-transform duration-200 ease-out-smooth group-hover:-translate-x-0.5" />
            </Link>
          }
        />
        <div dir="rtl" className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {routines.slice(0, 3).map((routine, index) => {
            const routineProducts = routine.products
              .map((id) => products.find((p) => p.id === id))
              .filter(Boolean)
              .slice(0, 3);
            return (
              <Link
                key={routine.id}
                href="/products"
                className="group relative overflow-hidden rounded-card border border-border bg-card shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-secondary/30 hover:shadow-card-hover hover:shadow-secondary/20"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${collectionGradients[index % collectionGradients.length]} opacity-60 transition-opacity duration-300 ease-out-smooth group-hover:opacity-80`} />
                <div className="relative p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-sans text-lg font-bold text-foreground transition-colors duration-200 group-hover:text-primary sm:text-xl">
                        {routine.nameAr}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{routine.descriptionAr}</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-all duration-300 ease-spring group-hover:-rotate-12 group-hover:scale-110">
                      <Sparkles size={18} />
                    </span>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex -space-x-3 space-x-reverse">
                      {routineProducts.map(
                        (p) =>
                          p && (
                            <span
                              key={p.id}
                              className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-card bg-card shadow-card"
                            >
                              <Image
                                src={p.gallery[0]}
                                alt={p.name.ar}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            </span>
                          )
                      )}
                    </div>
                    <span className="rounded-pill bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {routine.products.length} منتجات
                    </span>
                  </div>

                  <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-primary">
                    اكتشفي الروتين
                    <ArrowLeft size={15} className="transition-transform duration-200 ease-out-smooth group-hover:-translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
