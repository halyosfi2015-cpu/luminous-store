"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Clock } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { articles } from "@/lib/content";
import { useLang } from "@/lib/use-lang";

export default function Articles() {
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <section className="w-full bg-gradient-to-b from-background via-accent-50/20 to-background py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionTitle
          eyebrow={isAr ? "مدونة الجمال" : "Beauty Blog"}
          title={isAr ? "آخر المقالات" : "Latest Articles"}
          subtitle={
            isAr
              ? "نصائح وإرشادات للعناية ببشرتك من نخبة الخبراء"
              : "Tips and guides for your skincare from industry experts"
          }
          action={
            <Link
              href="/articles"
              className="group inline-flex items-center gap-1.5 rounded-pill border border-border px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 ease-out-smooth hover:border-primary/40 hover:bg-primary/5"
            >
              {isAr ? "عرض الكل" : "View All"}
              <ArrowLeft size={15} className={`transition-transform duration-200 ease-out-smooth group-hover:-translate-x-0.5 ${isAr ? "" : "rotate-180"}`} />
            </Link>
          }
        />
        <HorizontalCarousel ariaLabel={isAr ? "المقالات" : "Latest articles"}>
          {articles.slice(0, 6).map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="group relative w-80 shrink-0 overflow-hidden rounded-card border border-border bg-card shadow-card transition-all duration-300 ease-out-smooth hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/10 sm:w-96"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-card">
                <Image
                  src={article.coverImage}
                  alt={isAr ? article.titleAr : article.title}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-500 ease-out-smooth group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="absolute bottom-3 start-3 rounded-pill border border-white/40 bg-card/90 px-3 py-1 text-[11px] font-medium text-primary backdrop-blur-sm">
                  {isAr ? article.categoryAr : article.category}
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <h3 className="font-serif text-lg font-bold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary sm:text-xl">
                  {isAr ? article.titleAr : article.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                  {isAr ? article.excerptAr : article.excerpt}
                </p>
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {(isAr ? article.authorAr : article.author)?.charAt(0) || "?"}
                    </span>
                    <span className="truncate">{isAr ? (article.authorAr || article.author) : article.author}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {article.readTime} {isAr ? "دقيقة قراءة" : "min read"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </HorizontalCarousel>
      </Container>
    </section>
  );
}
