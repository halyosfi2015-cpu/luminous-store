# Luminous Derma — Project Structure

## Overview

Luminous Derma is a Next.js 16 e-commerce website for premium skincare and beauty products, targeting the Yemeni market. The application is fully server-rendered with static generation for product pages and dynamic rendering for authenticated sections.

## Root Directory

```
ld-final/
├── app/                    # Next.js App Router pages and layouts
├── components/             # React components organized by feature
├── context/                # React Context providers (Cart, Wishlist, Compare, Search)
├── data/                   # Re-export layer for @/data/products alias
├── lib/                    # Legacy compatibility layer (re-exports from src/)
├── scripts/                # Build-time patching scripts
├── src/                    # Source code (types, data)
│   ├── data/              # Canonical product data and helpers
│   └── types/             # TypeScript type definitions
├── types/                  # Legacy type re-exports (compatibility layer)
├── public/                 # Static assets (images, fonts)
├── docs/                   # Project documentation
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration (if present)
├── tsconfig.json           # TypeScript configuration
├── eslint.config.mjs       # ESLint configuration
├── postcss.config.mjs      # PostCSS configuration
├── package.json            # Dependencies and scripts
└── README.md               # Project readme
```

## Key Directories

### `app/` — Next.js App Router

All pages, layouts, loading states, and error boundaries.

```
app/
├── layout.tsx              # Root layout with Providers, skip-to-content link
├── page.tsx                # Home page (landing)
├── loading.tsx             # Global loading state
├── error.tsx               # Global error boundary
├── not-found.tsx           # 404 page
├── products/
│   ├── page.tsx            # Products listing page
│   ├── loading.tsx         # Products page loading state
│   └── [slug]/
│       └── page.tsx        # Product detail page (SSG)
├── categories/
│   ├── page.tsx            # Categories listing
│   ├── loading.tsx         # Categories loading state
│   └── [slug]/
│       └── page.tsx        # Category products page
├── brands/
│   ├── page.tsx            # Brands listing
│   └── [slug]/
│       └── page.tsx        # Brand detail page
├── articles/
│   ├── page.tsx            # Articles listing
│   └── [slug]/
│       └── page.tsx        # Article detail page
├── experts/
│   ├── page.tsx            # Experts listing
│   └── [slug]/
│       └── page.tsx        # Expert detail page
├── cart/
│   ├── page.tsx            # Shopping cart page
│   └── loading.tsx         # Cart loading state
├── checkout/
│   ├── page.tsx            # Checkout page
│   └── loading.tsx         # Checkout loading state
├── account/
│   ├── page.tsx            # Account dashboard
│   ├── loading.tsx
│   ├── addresses/
│   │   └── page.tsx        # Address management
│   ├── orders/
│   │   └── page.tsx        # Order history
│   └── profile/
│       └── page.tsx        # Profile settings
├── compare/
│   └── page.tsx            # Product comparison page
├── wishlist/
│   └── page.tsx            # Wishlist page
├── login/
│   ├── layout.tsx          # Login layout
│   └── page.tsx            # Login page
├── register/
│   ├── layout.tsx          # Register layout
│   └── page.tsx            # Register page
├── search/
│   └── page.tsx            # Search results page
├── contact/
│   └── page.tsx            # Contact page
├── faq/
│   └── page.tsx            # FAQ page
├── privacy/
│   └── page.tsx            # Privacy policy
├── terms/
│   └── page.tsx            # Terms of service
├── shipping/
│   └── page.tsx            # Shipping information
├── returns/
│   └── page.tsx            # Returns policy
├── order/
│   └── confirmation/
│       └── [id]/
│           └── page.tsx    # Order confirmation page
├── sitemap.ts              # Dynamic sitemap generation
└── robots.ts               # Robots.txt generation
```

### `components/` — React Components

Organized by feature area with `ui/` for shared primitives.

```
components/
├── ui/                     # Shared UI primitives
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Container.tsx
│   ├── Section.tsx
│   ├── SectionTitle.tsx
│   ├── Badge.tsx
│   ├── Input.tsx
│   ├── Textarea.tsx
│   ├── Select.tsx
│   └── IconButton.tsx
├── layout/                 # Layout components
│   ├── Header.tsx
│   ├── Navbar.tsx
│   ├── TopBar.tsx
│   └── Footer.tsx
├── product/                # Product-related components
│   ├── ProductCard.tsx
│   ├── ProductGallery.tsx
│   ├── ProductInfo.tsx
│   ├── ProductPurchase.tsx
│   ├── ProductTabs.tsx
│   ├── ProductReviews.tsx
│   ├── ProductBreadcrumb.tsx
│   ├── ProductGrid.tsx
│   ├── RelatedProducts.tsx
│   ├── CategoryContent.tsx
│   ├── FilterSidebar.tsx
│   ├── SortSelect.tsx
│   ├── ActiveFilters.tsx
│   ├── QuickActions.tsx
│   ├── WishlistButton.tsx
│   ├── CompareButton.tsx
│   ├── WishlistContent.tsx
│   └── CompareContent.tsx
├── home/                   # Home page sections
│   ├── Hero.tsx
│   ├── Categories.tsx
│   ├── Products.tsx
│   ├── Brands.tsx
│   ├── Doctors.tsx
│   ├── Articles.tsx
│   └── Newsletter.tsx
├── cart/                   # Cart-related components
│   ├── CartSummary.tsx
│   └── CartItemRow.tsx
├── contact/                # Contact form
│   └── ContactForm.tsx
├── search/                 # Search components
│   ├── SearchOverlay.tsx
│   └── SearchTrigger.tsx
└── Providers.tsx           # Context providers wrapper
```

### `src/` — Source Code

```
src/
├── data/
│   └── products.ts         # Canonical product data (30 products + helpers)
└── types/
    └── product.ts          # All TypeScript type definitions
```

### `data/` — Re-export Layer

```
data/
└── products.ts             # Re-exports from @/src/data/products for @/data/products alias
```

### `lib/` — Legacy Compatibility Layer

```
lib/
└── products.ts             # Re-exports from @/src/data/products for @/lib/products alias
```

### `types/` — Legacy Type Re-exports

```
types/
└── product.ts              # Re-exports from @/src/types/product for @/types/product alias
```

### `context/` — React Context Providers

```
context/
├── CartContext.tsx         # Shopping cart state management
├── WishlistContext.tsx     # Wishlist state management
├── CompareContext.tsx      # Product comparison state management
└── SearchContext.tsx       # Search state management
```

### `scripts/` — Build Scripts

```
scripts/
├── patch-next-runtime.js   # Next.js runtime patch
└── patch-lucide-client.js  # Lucide icons client patch
```

## Path Aliases

All imports use the `@/` alias which resolves to the project root:

| Alias | Resolves To |
|-------|-------------|
| `@/*` | `./*` (project root) |
| `@/types/product` | `types/product.ts` → `src/types/product.ts` |
| `@/src/types/product` | `src/types/product.ts` |
| `@/lib/products` | `lib/products.ts` → `src/data/products.ts` |
| `@/src/data/products` | `src/data/products.ts` |
| `@/data/products` | `data/products.ts` → `src/data/products.ts` |

## Technology Stack

- **Framework**: Next.js 16.2.12 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React 1.27.0
- **Fonts**: Noto Sans Arabic, Tajawal (via @fontsource)
- **Bundler**: Turbopack (Next.js default)
- **Linting**: ESLint 9 with Next.js config