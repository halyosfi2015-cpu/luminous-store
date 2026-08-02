# Package 2C — Product Catalog (Product Listing Page)

## Objective

Build the Product Catalog — the core shopping area where customers browse products by category, apply filters, sort results, and discover products. The catalog must feel like a premium beauty consultant, not a simple product list.

## Source

Chapter 5 — Product Catalog & Shopping Experience from the Master Specification.

---

## Components

### 1. Category Page Route

- **File:** `app/categories/[slug]/page.tsx`
- Server component
- `generateStaticParams` for known categories
- `generateMetadata` with title/description per category
- Assembles: Breadcrumb → ActiveFilters → SortSelect → ProductGrid → (no results state)
- Uses a static product data source (expand product.ts types and data)

### 2. ProductCard Component

- **File:** `components/product/ProductCard.tsx`
- Reusable card used in PLP grid and RelatedProducts
- Props: `product: Product`
- Displays: Image placeholder, Wishlist heart, Discount badge, Brand, Name (Arabic), Rating stars + count, Price (current + old), Add to Cart button
- Links to `/products/[slug]`
- RTL support

### 3. ProductGrid Component

- **File:** `components/product/ProductGrid.tsx`
- Props: `products: Product[]`
- Responsive grid: 4 columns desktop, 3 tablet, 2 mobile
- Maps products to ProductCard
- Empty state: friendly message + suggestion

### 4. FilterSidebar Component

- **File:** `components/product/FilterSidebar.tsx`
- "use client"
- Filter groups:
  - **Brand:** checkboxes (CeraVe, COSRX, La Roche-Posay, etc.)
  - **Skin Type:** checkboxes (dry, oily, combination, sensitive, normal)
  - **Skin Concern:** checkboxes (acne, pigmentation, aging, dryness, redness)
  - **Price Range:** predefined ranges (0–5000, 5000–10000, 10000–15000, 15000+)
  - **Rating:** clickable star rows (4+, 3+, 2+, 1+)
- Props: `filters: FilterState`, `onFilterChange: (filters: FilterState) => void`
- Responsive: sidebar on desktop, slide-over drawer on mobile (toggle button)
- RTL support

### 5. SortSelect Component

- **File:** `components/product/SortSelect.tsx`
- "use client"
- Dropdown with options: الأكثر مبيعاً, الأحدث, السعر: من الأقل للأعلى, السعر: من الأعلى للأقل, الأعلى تقييماً
- Props: `value: SortOption`, `onChange: (value: SortOption) => void`

### 6. ActiveFilters Component

- **File:** `components/product/ActiveFilters.tsx`
- Displays active filter pills with remove (×) button
- "إزالة الكل" (Clear All) button
- Props: `filters: FilterState`, `onRemove: (key: string, value?: string) => void`, `onClear: () => void`

### 7. Type & Data Updates

- **File:** `types/product.ts` — add `FilterState`, `SortOption`, expand product catalog
- **File:** `lib/products.ts` — shared product data (extracted from PDP page)

---

## Routes

| Route | Page |
|-------|------|
| `/categories/[slug]` | Category listing with filters + sort |

---

## Data Types

```typescript
type FilterState = {
  brands: string[];
  skinTypes: string[];
  skinConcerns: string[];
  priceRanges: string[];
  ratings: number[];
};

type SortOption = "popular" | "newest" | "price_asc" | "price_desc" | "rating";
```

---

## Design Rules

- Follow the Luminous Derma design system (Purple 800 #5B2A86, rounded-2xl cards, soft shadows)
- Reuse existing Card, Button, Container, SectionTitle components
- Arabic-first: all labels in Arabic, RTL layout
- Mobile-first responsive design
- No hardcoded data in components — use the shared data source

---

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Deliverables

- All new files listed above
- Updated types/product.ts
- New lib/products.ts shared data
- ZIP of updated project
