# Component Architecture

## Architecture Overview

Luminous Derma uses a feature-based component organization with shared UI primitives in `components/ui/`. Components follow a container/presentational pattern where appropriate, with client-side interactivity isolated to `"use client"` components.

## Component Categories

### 1. UI Primitives (`components/ui/`)

Reusable, unstyled building blocks. These are the lowest-level components and should not contain business logic.

| Component | Purpose |
|-----------|---------|
| `Button` | Primary, secondary, outline, ghost variants |
| `Card` | Container with optional hover effect and padding |
| `Container` | Max-width constrained wrapper |
| `Section` | Semantic section wrapper |
| `SectionTitle` | Heading with eyebrow, title, subtitle, and optional action |
| `Badge` | Small status indicator |
| `Input` | Text input with label and error states |
| `Textarea` | Multi-line text input |
| `Select` | Dropdown select component |
| `IconButton` | Button that renders only an icon |

### 2. Layout Components (`components/layout/`)

Page-level structural components.

| Component | Purpose |
|-----------|---------|
| `Header` | Top navigation bar with logo and search trigger |
| `Navbar` | Category navigation bar |
| `TopBar` | Thin top bar with currency/language info |
| `Footer` | Site footer with links and newsletter signup |

### 3. Product Components (`components/product/`)

All components related to product display and interaction.

| Component | Props | Purpose |
|-----------|-------|---------|
| `ProductCard` | `product: Product` | Product grid card with image, price, rating, add-to-cart |
| `ProductGallery` | `images: string[]`, `name: string` | Image gallery with zoom, thumbnails, navigation |
| `ProductInfo` | `product: Product` | Product title, brand, rating, description |
| `ProductPurchase` | `product: Product` | Price display, quantity selector, add-to-cart, wishlist/compare |
| `ProductTabs` | `product: Product` | Tabbed interface for benefits, ingredients, how-to-use, skin compatibility |
| `ProductReviews` | `reviews: ProductReview[]` | Customer reviews with star ratings and verification badges |
| `ProductBreadcrumb` | `category`, `categorySlug`, `productName` | Breadcrumb navigation |
| `ProductGrid` | `products: Product[]` | Responsive grid of ProductCards |
| `RelatedProducts` | `products: Product[]` | Grid of related products |
| `CategoryContent` | `products: Product[]` | Filterable, sortable product listing with sidebar |
| `FilterSidebar` | `filters: FilterState`, `onChange` | Brand, skin type, skin concern, price range, rating filters |
| `SortSelect` | `value: SortOption`, `onChange` | Sort dropdown |
| `ActiveFilters` | `filters: FilterState`, `onRemove`, `onClear` | Display and remove active filters |
| `QuickActions` | `product: Product` | Floating action bar (add to cart, view, wishlist, compare) |
| `WishlistButton` | `productId`, `iconOnly`, `size` | Toggle wishlist button |
| `CompareButton` | `productId`, `iconOnly`, `size` | Toggle compare button |
| `WishlistContent` | — | Full wishlist page content |
| `CompareContent` | — | Full comparison table content |

### 4. Home Page Components (`components/home/`)

| Component | Purpose |
|-----------|---------|
| `Hero` | Hero banner with call-to-action |
| `Categories` | Category grid/navigation |
| `Products` | Featured/new/best-selling products with tab filtering |
| `Brands` | Brand showcase |
| `Doctors` | Doctor recommendations section |
| `Articles` | Blog/article previews |
| `Newsletter` | Email signup form |

### 5. Context Components (`context/`)

| Component | Purpose |
|-----------|---------|
| `CartProvider` | Shopping cart state, add/remove/update items, persists to localStorage |
| `WishlistProvider` | Wishlist state, toggle items, persists to localStorage |
| `CompareProvider` | Comparison list state, toggle items, persists to localStorage |
| `SearchProvider` | Search overlay state |

### 6. Search Components (`components/search/`)

| Component | Purpose |
|-----------|---------|
| `SearchOverlay` | Full-screen search overlay with trending searches and results |
| `SearchTrigger` | Button that opens the search overlay |

## Component Patterns

### Data Fetching

Product data is imported from `@/src/data/products` (canonical source) or via compatibility layers `@/lib/products` and `@/data/products`. All components receive product data as props — they do not fetch data themselves.

### State Management

- **Client state**: React Context (Cart, Wishlist, Compare, Search)
- **Local UI state**: `useState` within components
- **Persistent state**: `localStorage` via Context providers

### Dynamic Imports

Heavy components on the home page are dynamically imported with `next/dynamic`:

```tsx
const Hero = dynamic(() => import("@/components/home/Hero"));
const Categories = dynamic(() => import("@/components/home/Categories"));
// ... etc.
```

This defers loading of below-the-fold sections until needed.

### RTL Support

All pages use `dir="rtl"` on the `<html>` element (set in `app/layout.tsx`). Components are designed for right-to-left layout.

### Accessibility

- Skip-to-content link in layout
- `aria-label` on all icon-only buttons
- `role="tablist"` on tab interfaces
- `aria-selected` on active tabs
- Semantic HTML (`<main>`, `<nav>`, `<section>`, `<article>`)
- Proper heading hierarchy (h1 → h2 → h3)