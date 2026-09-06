// Product cheaper alternative finder
// Finds a cheaper published product in the same category with functional similarity

// Internal product interface (simplified)
interface Product {
  id: string;
  slug: string;
  name: { ar: string; en: string };
  brand: string;
  category: string;
  pricing: { price: number; currency: string };
  gallery: string[];
}

// Find cheaper alternative for a given product
// Returns a product that is:
// - In the same category
// - Cheaper than the current product
// - Has a valid gallery image
// - Is not the same product
export function getCheaperAlternative(
  products: { id: string; slug: string; name: { ar: string; en: string }; brand: string; category: string; pricing: { price: number; currency: string }; gallery: string[] }[],
  currentProduct: { id: string; slug: string; name: { ar: string; en: string }; brand: string; category: string; pricing: { price: number; currency: string }; gallery: string[] }
): { product: { id: string; slug: string; name: { ar: string; en: string }; brand: string; category: string; pricing: { price: number; currency: string }; gallery: string[] } | null ; savings: number } | null {
  // Filter to same category, cheaper price, and not the same product
  const alternatives = products.filter((p) => 
    p.category === currentProduct.category &&
    p.pricing.price < currentProduct.pricing.price &&
    p.id !== currentProduct.id &&
    p.gallery && p.gallery.length > 0
  );

  if (alternatives.length === 0) {
    return null;
  }

  // Sort by price (cheapest first) and pick the best alternative
  // that has meaningful functional similarity (same basic category)
  alternatives.sort((a, b) => a.pricing.price - b.pricing.price);

  const cheapest = alternatives[0];
  const savings = currentProduct.pricing.price - cheapest.pricing.price;

  return {
    product: cheapest,
    savings,
  };
}