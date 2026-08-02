import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articles } from "@/lib/content";
import ArticlePageClient from "./ArticlePageClient";

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) return {};
  return {
    title: `${article.titleAr} | ${article.title} | Luminous Derma`,
    description: article.excerptAr,
    keywords: article.seoMetadata.keywords,
    alternates: {
      languages: {
        ar: `https://luminousderma.com/articles/${article.slug}`,
        en: `https://luminousderma.com/en/articles/${article.slug}`,
      },
    },
    openGraph: {
      title: article.titleAr,
      description: article.excerptAr,
      images: [article.coverImage],
    },
  };
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();
  return <ArticlePageClient article={article} />;
}
