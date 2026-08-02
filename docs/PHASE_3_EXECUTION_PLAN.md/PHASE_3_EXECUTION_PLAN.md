# Luminous Derma

# Phase 3 --- Real Data Architecture

Version: 1.0

## Objective

Transform the project from a static frontend into a scalable,
data-driven platform while preserving the approved architecture and
design system.

## Principles

-   Continue from the current project state.
-   Do NOT redesign completed phases.
-   Centralize all business data.
-   Components consume data; they never own it.

## Scope

### Products

Create centralized product data with: - id - slug - sku - name -
descriptions - brand - category - pricing - gallery - ingredients -
usage instructions - skin types - benefits - stock - rating -
featured/new flags - SEO metadata

### Categories

Centralized categories with: - id - slug - name - description - icon -
cover image - SEO metadata

### Brands

Centralized brands with: - id - slug - name - logo - cover -
description - story - website - SEO metadata

### Experts

Centralized experts with: - id - slug - name - professional title -
specialties - biography - profile image - cover image - languages -
consultation types - services - recommended products - featured
articles - social links - SEO metadata

**Do NOT include years of experience.**

### Articles

Centralized articles supporting: - id - slug - title - excerpt -
content - author - category - cover image - publish date - reading
time - related products - related articles - SEO metadata

### Navigation

Use one shared navigation source for Header, Navbar, Footer and Mobile
Navigation.

### Site Configuration

Centralize: - Company information - Contact details - Social links -
Business hours

## Out of Scope

-   Authentication
-   Payments
-   Orders
-   Admin Dashboard
-   Database
-   CMS integration

## Acceptance Criteria

-   One centralized data source per entity.
-   No duplicated business data.
-   Existing UI preserved.
-   CMS-ready architecture.

## Verification

Run: - npx tsc --noEmit - npm run lint - npm run build

All must pass before completion.
