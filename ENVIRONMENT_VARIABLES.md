# Environment Variables

## Overview

Luminous Derma uses environment variables for configuration. All variables are defined in `.env.local` (not committed to version control).

## Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SITE_URL` | Base URL of the production site | `https://luminousderma.com` |
| `NEXT_PUBLIC_GA_ID` | Google Analytics measurement ID | `G-XXXXXXXXXX` |

## Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_DEBUG` | Enable debug mode | `false` |
| `NEXT_PUBLIC_CART_STORAGE_KEY` | localStorage key for cart persistence | `luminous-cart` |
| `NEXT_PUBLIC_WISHLIST_STORAGE_KEY` | localStorage key for wishlist persistence | `luminous-wishlist` |
| `NEXT_PUBLIC_COMPARE_STORAGE_KEY` | localStorage key for compare persistence | `luminous-compare` |

## Usage in Code

Environment variables are accessed via `process.env`:

```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://luminousderma.com";
```

**Important**: Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser bundle. Server-only variables should not have this prefix.

## Local Development

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEBUG=true
```

## Production Environment

Set environment variables in your hosting platform:

- **Vercel**: Project Settings → Environment Variables
- **Docker**: Pass via `-e` flag or `.env` file
- **CI/CD**: Set in pipeline configuration