import Link from "next/link";
import { Newspaper } from "lucide-react";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import { articles } from "@/lib/content";
import { getDir, t } from "@/lib/translate";
import Image from "next/image";

export async function generateMetadata() {
  const lang = getDir() === "rtl" ? "ar" : "en";
  const title = lang === "ar" ? "المقالات - Luminous Derma" : "Articles - Luminous Derma";
  const description = lang === "ar"
    ? "نصائح وإرشادات للعناية بالبشرة من خبرائنا في Luminous Derma — دليلك الشامل للعناية ببشرتك"
    : "Tips and guides for your skincare from industry experts at Luminous Derma";
  return { title, description };
}

export default function ArticlesPage() {
  const isAr = getDir() === "rtl";

  return (
    <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-background py-8">
      <Container>
        <h1 className={`mb-1 flex items-center gap-2 text-2xl font-bold text-foreground ${isAr ? "" : "flex-row-reverse"}`}>
          <Newspaper size={24} className="text-primary" />
          {t("المقالات", "Articles")}
        </h1>
        <p className="mb-8 text-sm text-muted">
          {t("نصائح وإرشادات للعناية بالبشرة من خبرائنا", "Tips and guides for your skincare from industry experts")}
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.id} href={`/articles/${article.slug}`}>
              <Card className="flex h-full flex-col gap-4 transition-shadow hover:shadow-card-hover">
                <div className="relative aspect-video w-full overflow-hidden rounded-t-card">
                  <Image
                    src={article.coverImage}
                    alt={isAr ? article.titleAr : article.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="px-1 pb-1">
                  <span className="rounded-full bg-primary/5 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                    {isAr ? article.categoryAr : article.category}
                  </span>
                  <p className="mt-2 text-base font-semibold text-foreground line-clamp-2">
                    {isAr ? article.titleAr : article.title}
                  </p>
                  <p className="mt-1 text-sm text-muted line-clamp-2">
                    {isAr ? article.excerptAr : article.excerpt}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span>{isAr ? article.authorAr : article.author}</span>
                    <span>{article.readTime} {isAr ? "دقيقة قراءة" : "min read"}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}
