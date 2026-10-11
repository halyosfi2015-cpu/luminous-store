"use client";

import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import CategoryTreeNav from "@/components/category/CategoryTreeNav";
import { useLang } from "@/lib/use-lang";
import {
  taxonomyCategoryIcons,
  taxonomyCategoryColors,
  taxonomyCategoryBgColors,
} from "@/components/layout/taxonomyCategoryUi";
import { categoryTree } from "@/components/layout/navConfig";

export const categoryIcons = taxonomyCategoryIcons;
export const categoryColors = taxonomyCategoryColors;
export const categoryBgColors = taxonomyCategoryBgColors;

export default function Categories() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <section className="w-full bg-gradient-to-b from-card via-accent-50/30 to-card py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionTitle
          eyebrow={isAr ? "تسوقي حسب الفئة" : "Shop by Category"}
          title={isAr ? "اكتشفي تشكيلتنا" : "Discover Our Collection"}
          subtitle={
            isAr
              ? "مجموعة مختارة بعناية من أفضل المنتجات لكل احتياجاتك"
              : "Carefully curated selection of best products for all your needs"
          }
        />
        <CategoryTreeNav tree={categoryTree} showCounts={false} />
      </Container>
    </section>
  );
}
