# Deployment Guide

## Prerequisites

- Node.js 20+
- npm 10+
- Git

## Build & Deploy

### 1. Install Dependencies

```bash
npm install
```

This runs `postinstall` scripts that patch Next.js runtime and Lucide icons for client-side compatibility.

### 2. Development

```bash
npm run dev
```

Starts the development server on `http://localhost:3000`.

### 3. Production Build

```bash
npm run build
```

Generates an optimized production build in `.next/`. All product pages are statically generated (SSG). Dynamic routes (brand, category, article, expert, order confirmation) use `generateStaticParams` for pre-rendering.

### 4. Start Production Server

```bash
npm start
```

Runs the production Next.js server on port 3000.

### 5. Linting

```bash
npm run lint
```

Runs ESLint with Next.js config.

## Deployment Options

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `.next`
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

## Configuration

### next.config.ts

Key production settings:

- **Image optimization**: AVIF + WebP formats, device-aware sizing
- **Security headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **Compression**: Enabled
- **Static asset caching**: 1-year immutable cache for `/static/*`
- **Powered-by header**: Disabled (hides Next.js version)

### TypeScript

- Strict mode enabled
- No emit (type-checking only during build)
- Path aliases: `@/*` → `./*`

### ESLint

- Next.js core web vitals config
- TypeScript config
- Ignores `.next/`, `out/`, `build/`, `node_modules/`

## Static Generation

The following routes are pre-rendered at build time via `generateStaticParams`:

- `/products/[slug]` — All 30 product pages
- `/categories/[slug]` — All category pages
- `/brands/[slug]` — All brand pages
- `/articles/[slug]` — All article pages
- `/experts/[slug]` — All expert pages
- `/order/confirmation/[id]` — Order confirmation pages

## Environment

The application runs in three environments:

| Environment | Command | Purpose |
|-------------|---------|---------|
| Development | `npm run dev` | Local development with hot reload |
| Production | `npm start` | Production server after build |
| Build | `npm run build` | Generate optimized production bundle |