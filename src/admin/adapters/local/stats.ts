import { products, categories } from "@/src/data/products";
import { brands } from "@/src/data/brands";
import { articles } from "@/src/data/articles";
import { getEngineStats } from "@/src/engine/engine";
import { getHeroOverride } from "@/src/engine/hero/engine";
import { loadGovernorates } from "@/src/data/shipping";
import { listExperts } from "./experts";
import { listRoutines } from "./routines";
import { listBundles } from "./bundles";
import type { AdminStats } from "../../types";

const stockOf = (product: { stock: number; stockQuantity?: number }) =>
  product.stockQuantity ?? product.stock;

export function computeStats(): AdminStats {
  const lowStock = products.filter((product) => {
    const qty = stockOf(product);
    return (product.inStock ?? qty > 0) && qty > 0 && qty <= 10;
  }).length;
  const outOfStock = products.filter(
    (product) => product.inStock === false || stockOf(product) <= 0,
  ).length;

  let offersEngine = null;
  try {
    offersEngine = getEngineStats();
  } catch {}

  return {
    productTotal: products.length,
    featuredProducts: products.filter(
      (product) => product.isFeatured || product.featured,
    ).length,
    newProducts: products.filter((product) => product.isNew || product.new).length,
    bestSellers: products.filter((product) => product.isBestSeller).length,
    lowStock,
    outOfStock,
    categoryCount: categories.length,
    brandCount: brands.length,
    routinesCount: listRoutines().length,
    bundlesCount: listBundles().length,
    expertsCount: listExperts().length,
    articlesCount: articles.length,
    offersEngine,
    heroActive: getHeroOverride() !== null,
    enabledGovernorates: loadGovernorates().filter(
      (governorate) => governorate.enabled,
    ).length,
  };
}
