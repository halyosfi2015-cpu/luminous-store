# Maintenance Guide

## Regular Tasks

### Weekly

- Review and respond to any new product inquiries or issues
- Check analytics for traffic patterns and popular products
- Verify all links and pages are functioning correctly

### Monthly

- Update product inventory and pricing
- Review and update SEO metadata
- Check for outdated dependencies (`npm outdated`)
- Review error logs for runtime issues
- Update sitemap if new content is added

### Quarterly

- Audit accessibility (keyboard navigation, screen reader testing)
- Review and update product images
- Performance audit (Lighthouse, Web Vitals)
- Security dependency audit (`npm audit`)
- Review and update documentation

## Adding a New Product

1. Add product data to `src/data/products.ts` following the `Product` interface
2. Include all required fields: `id`, `slug`, `name`, `description`, `brand`, `category`, `pricing`, `gallery`, `ingredients`, `usageInstructions`, `skinTypes`, `benefits`, `stock`, `rating`, `seoMetadata`
3. Add product images to `public/images/products/`
4. Run `npm run build` to verify the product page generates correctly
5. Verify the product appears in search, categories, and related products

## Updating Product Data

1. Edit the product entry in `src/data/products.ts`
2. Run `npm run build` to regenerate static pages
3. Deploy the updated build

**Important**: Do not modify `lib/products.ts` or `types/product.ts` directly. These are compatibility layers that re-export from `src/data/products.ts` and `src/types/product.ts`.

## Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update a specific package
npm update <package-name>

# Update all packages
npm update

# Check for security vulnerabilities
npm audit
```

## Troubleshooting

### Build Fails

1. Run `npx tsc --noEmit` to check for TypeScript errors
2. Run `npm run lint` to check for linting issues
3. Check `.next/build` output for specific errors

### Product Page Not Updating

1. Verify the product exists in `src/data/products.ts`
2. Check that `generateStaticParams` includes the product slug
3. Run `npm run build` and check for the product in the output

### Styles Not Loading

1. Verify Tailwind CSS is configured in `tailwind.config.ts`
2. Check that `globals.css` imports Tailwind directives
3. Clear `.next/` cache and rebuild

### Cart/Wishlist/Compare Not Persisting

1. Verify localStorage is available (not blocked by browser settings)
2. Check that context providers are wrapped around the app in `layout.tsx`

## File Structure Guidelines

- **Never modify** `lib/products.ts` or `types/product.ts` directly — they are compatibility layers
- **Always edit** `src/data/products.ts` for data changes
- **Always edit** `src/types/product.ts` for type changes
- **Keep** `data/products.ts` and `lib/products.ts` as re-export-only files
- **Do not** add new top-level files unless they are compatibility layers

## Rollback Procedure

1. Revert to the previous git commit
2. Rebuild: `npm run build`
3. Redeploy the previous build