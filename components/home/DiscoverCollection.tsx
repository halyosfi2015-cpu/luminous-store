"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  FaSun,
  FaHeart,
  FaVial,
  FaSoap,
  FaCut,
  FaWater,
  FaFeather,
  FaSprayCan,
} from "react-icons/fa";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { useLang } from "@/lib/use-lang";
import type { IconType } from "react-icons";

type CollectionItem = {
  slug: string;
  nameAr: string;
  nameEn: string;
  tagAr: string;
  tagEn: string;
  icon: IconType;
  gradient: string;
  softBg: string;
};

const collectionItems: CollectionItem[] = [
  {
    slug: "sunscreen",
    nameAr: "واقي الشمس",
    nameEn: "Sunscreen",
    tagAr: "حماية يومية",
    tagEn: "Daily Protection",
    icon: FaSun,
    gradient: "from-amber-400 via-orange-400 to-rose-400",
    softBg: "from-amber-50 to-orange-100",
  },
  {
    slug: "lip-care",
    nameAr: "عناية الشفاه",
    nameEn: "Lip Care",
    tagAr: "ترطيب وتغذية",
    tagEn: "Nourish & Hydrate",
    icon: FaHeart,
    gradient: "from-rose-400 via-pink-400 to-fuchsia-400",
    softBg: "from-rose-50 to-pink-100",
  },
  {
    slug: "serums",
    nameAr: "السيروم",
    nameEn: "Serums",
    tagAr: "علاجات مكثفة",
    tagEn: "Intensive Care",
    icon: FaVial,
    gradient: "from-violet-400 via-purple-400 to-fuchsia-400",
    softBg: "from-violet-50 to-purple-100",
  },
  {
    slug: "cleansers",
    nameAr: "منظفات البشرة",
    nameEn: "Cleansers",
    tagAr: "تنظيف لطيف",
    tagEn: "Gentle Cleanse",
    icon: FaSoap,
    gradient: "from-cyan-400 via-sky-400 to-blue-400",
    softBg: "from-cyan-50 to-sky-100",
  },
  {
    slug: "shampoo",
    nameAr: "عناية الشعر",
    nameEn: "Hair Care",
    tagAr: "صحة ولمعان",
    tagEn: "Health & Shine",
    icon: FaCut,
    gradient: "from-emerald-400 via-teal-400 to-cyan-400",
    softBg: "from-emerald-50 to-teal-100",
  },
  {
    slug: "moisturizers",
    nameAr: "المرطبات",
    nameEn: "Moisturizers",
    tagAr: "ترطيب عميق",
    tagEn: "Deep Hydration",
    icon: FaWater,
    gradient: "from-blue-400 via-indigo-400 to-violet-400",
    softBg: "from-blue-50 to-indigo-100",
  },
  {
    slug: "masks",
    nameAr: "الأقنعة",
    nameEn: "Masks",
    tagAr: "عناية فاخرة",
    tagEn: "Luxury Ritual",
    icon: FaFeather,
    gradient: "from-fuchsia-400 via-purple-400 to-violet-400",
    softBg: "from-fuchsia-50 to-purple-100",
  },
  {
    slug: "perfume-women",
    nameAr: "العطور",
    nameEn: "Perfumes",
    tagAr: "فخامة وتميز",
    tagEn: "Elegance & Luxury",
    icon: FaSprayCan,
    gradient: "from-amber-300 via-orange-300 to-pink-400",
    softBg: "from-amber-50 to-pink-100",
  },
];

export default function DiscoverCollection() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <section className="w-full bg-gradient-to-b from-card via-accent-50/30 to-card py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionTitle
          eyebrow={isAr ? "اكتشفي المجموعة" : "Discover Our Collection"}
          title={isAr ? "اكتشفي تشكيلتنا" : "Discover Our Collection"}
          subtitle={
            isAr
              ? "استكشفي مجموعتنا المختارة من المنتجات الفاخرة لكل احتياجاتك"
              : "Explore our curated selection of premium products for every need"
          }
          action={
            <Link
              href="/categories"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              {isAr ? "عرض الكل" : "View All"}
              <ArrowLeft
                size={15}
                className={`transition-transform duration-200 ease-out-smooth group-hover:-translate-x-0.5 ${isAr ? "" : "rotate-180"}`}
              />
            </Link>
          }
        />
        <HorizontalCarousel ariaLabel={isAr ? "اكتشفي المجموعة" : "Discover our collection"}>
          {collectionItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.slug}
                href={`/categories/${item.slug}`}
                className="group relative w-44 shrink-0 overflow-hidden rounded-card border border-border bg-card p-6 text-center shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-accent/30 hover:shadow-card-hover sm:w-48"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${item.softBg} opacity-0 transition-opacity duration-300 ease-out-smooth group-hover:opacity-100`}
                />
                <div className="relative flex flex-col items-center gap-3">
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${item.gradient} text-white shadow-card transition-all duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-110 group-hover:shadow-lg sm:h-20 sm:w-20`}
                  >
                    <Icon size={32} />
                  </span>
                  <span className="text-sm font-bold text-foreground transition-colors duration-200 group-hover:text-primary sm:text-base">
                    {isAr ? item.nameAr : item.nameEn}
                  </span>
                  <span className="text-[11px] font-medium text-muted">
                    {isAr ? item.tagAr : item.tagEn}
                  </span>
                </div>
              </Link>
            );
          })}
        </HorizontalCarousel>
      </Container>
    </section>
  );
}
