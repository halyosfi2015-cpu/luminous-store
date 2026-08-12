# Data Architecture

## Overview

Luminous Derma uses a centralized data architecture with a single source of truth for product data. The architecture follows a three-layer pattern: canonical source, compatibility layer, and re-export alias.

## Data Layers

### Layer 1: Canonical Source (`src/data/products.ts`)

The authoritative data source. Contains:

- **`Product` interface** — All 30+ products with nested structure
- **`categories`** — 18 product categories
- **`sectionCategories`** — 7 section categories (Skincare, Haircare, Bodycare, Makeup, Perfume, Baby & Mom, Tools)
- **Helper functions**:
  - `getProductBySlug(slug)` — Find product by slug
  - `getProductsByCategory(categorySlug)` — Filter by category (supports section categories)
  - `getCategoryBySlug(slug)` — Find category info
  - `getFeaturedProducts()` — Products marked as featured
  - `getNewArrivals()` — New products (limit 8)
  - `getBestSellers()` — Best-selling products (limit 8)
  - `getDoctorRecommended()` — Doctor-recommended products (limit 8)
  - `getRelatedProducts(product, count)` — Related products by category/brand
  - `searchProducts(query)` — Full-text search across name, brand, category, description
- **`routines`** — 5 curated skincare routines

### Layer 2: Compatibility Layer (`lib/products.ts`)

Re-exports everything from `src/data/products.ts`. All existing imports from `@/lib/products` continue to work without modification.

### Layer 3: Re-export Alias (`data/products.ts`)

Re-exports from `src/data/products.ts` for the `@/data/products` import path.

### Layer 4: Type Re-export (`types/product.ts`)

Re-exports all types from `src/types/product.ts` for the `@/types/product` import path.

## Product Data Structure

### `Product` Interface (src/types/product.ts)

```typescript
interface Product {
  id: string;
  slug: string;
  sku: string;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  brand: string;
  brandAr?: string;
  category: string;
  categoryAr?: string;
  categorySlug?: string;
  pricing: { price: number; currency: string; originalPrice?: number };
  discount?: number;
  gallery: string[];
  images?: string[];
  ingredients: { ar: string[]; en: string[] };
  usageInstructions: { ar: string; en: string };
  howToUse?: string[];
  howToUseAr?: string[];
  skinTypes: string[];
  suitableFor?: string[];
  skinConcerns?: string[];
  benefits: { ar: string[]; en: string[] };
  stock: number;
  inStock?: boolean;
  stockQuantity?: number;
  rating: number;
  reviewCount?: number;
  reviews?: ProductReview[];
  featured?: boolean;
  isFeatured?: boolean;
  new?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  isDoctorRecommended?: boolean;
  tags?: string[];
  seoMetadata: {
    title: { ar: string; en: string };
    description: { ar: string; en: string };
    keywords: string[];
  };
}
```

### Nested vs. Flat Fields

The architecture uses a **nested structure** for all product data:

| Domain | Nested Field | Old Flat Field (deprecated) |
|--------|-------------|---------------------------|
| Name | `name.ar`, `name.en` | `nameAr`, `name` |
| Description | `description.ar`, `description.en` | `descriptionAr`, `description` |
| Pricing | `pricing.price`, `pricing.originalPrice` | `price`, `oldPrice` |
| Images | `gallery` | `images` |
| Brand | `brand` | `brand` (same) |
| Category | `category`, `categoryAr`, `categorySlug` | `category`, `categoryAr` |
| Stock | `stock`, `inStock`, `stockQuantity` | `inStock`, `stockQuantity` |
| Status | `featured`, `new`, `isBestSeller`, `isDoctorRecommended` | `isFeatured`, `isNew`, `isBestSeller`, `isDoctorRecommended` |

### Supporting Types

```typescript
type SkinType = "dry" | "oily" | "combination" | "sensitive" | "normal" | "all";
type SkinConcern = "acne" | "dryness" | "pigmentation" | "aging" | "redness" | "large_pores" | "uneven_texture" | "dark_circles" | "oiliness" | "sensitivity";
type SortOption = "popular" | "newest" | "price_asc" | "price_desc" | "rating" | "name_asc";
type FilterState = { brands: string[]; skinTypes: SkinType[]; skinConcerns: SkinConcern[]; priceRanges: string[]; ratings: number[]; };
type ProductReview = { id: string; customerName: string; customerNameAr?: string; avatar?: string; rating: number; comment: string; commentAr?: string; date: string; isVerified: boolean; helpfulCount?: number; };
type Ingredient = { name: string; nameAr: string; benefit: string; benefitAr: string; isHighlighted?: boolean; };
type CategoryInfo = { slug: string; name: string; nameAr: string; description: string; descriptionAr: string; image?: string; coverImage?: string; productCount?: number; icon?: string; };
type Routine = { id: string; name: string; nameAr: string; description: string; descriptionAr: string; products: string[]; image?: string; };
```

## Data Flow

```
src/data/products.ts (canonical)
    │
    ├──→ lib/products.ts (compatibility re-export)
    │         │
    │         └──→ @/lib/products (pages, components)
    │
    ├──→ data/products.ts (alias re-export)
    │         │
    │         └──→ @/data/products (components like ProductTabs)
    │
    └──→ src/types/product.ts (type definitions)
              │
              └──→ types/product.ts (type re-export)
                        │
                        └──→ @/types/product (all components)
```

## Product IDs

Products use sequential IDs (`p001` through `p030`) and unique slugs (e.g., `vitamin-c-brightening-serum`). SKU format: `{brand-prefix}-{product-code}`.

## Categories

18 flat categories and 7 section categories. Section categories group flat categories (e.g., "Skincare" groups Cleansers, Toners, Serums, etc.). Products are linked to categories via `categorySlug`.