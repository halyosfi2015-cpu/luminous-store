import { articles } from "@/src/data/articles";
import type { Article } from "@/src/types/article";

export function listArticles(): Article[] {
  return articles;
}
