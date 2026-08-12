"use client";

import Link from "next/link";
import { ChevronRight, Clock, User } from "lucide-react";
import Container from "@/components/ui/Container";
import { useLang } from "@/lib/use-lang";
import Image from "next/image";
import type { Article } from "@/src/types/article";

export default function ArticlePageClient({ article }: { article: Article }) {
  const { lang } = useLang();
  const isAr = lang === "ar";

  const content = isAr ? article.contentAr : article.content;
  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-background py-8">
      <Container>
        <nav aria-label={t("التنقل", "Navigation")} className="mb-6">
          <Link
            href="/articles"
            className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-primary"
          >
            <ChevronRight size={16} className={isAr ? "" : "rotate-180"} />
            {t("المقالات", "Articles")}
          </Link>
        </nav>

        <article className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-card bg-card shadow-card">
            <div className="relative aspect-video w-full overflow-hidden">
              <Image
                src={article.coverImage}
                alt={isAr ? article.titleAr : article.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6 sm:p-8">
              <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                {isAr ? article.categoryAr : article.category}
              </span>
              <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
                {isAr ? article.titleAr : article.title}
              </h1>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
                {isAr ? article.excerptAr : article.excerpt}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <User size={14} />
                  {isAr ? article.authorAr : article.author}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {article.readTime} {t("دقيقة قراءة", "min read")}
                </span>
                <span>{new Date(article.publishDate).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</span>
              </div>
              <div className="mt-6 border-t border-border pt-6 text-sm leading-relaxed text-muted">
                {content}
              </div>
            </div>
          </div>
        </article>
      </Container>
    </main>
  );
}
