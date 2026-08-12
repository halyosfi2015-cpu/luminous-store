# Luminous Derma
# Project Rules & Engineering Constitution

Version: 1.0
Status: ACTIVE
Authority: Executive Project Documentation

---

# 1. Project Philosophy

Luminous Derma is NOT a demo project.

It is being built as a production-ready luxury skincare platform that must remain maintainable, scalable, and enterprise-grade.

Every technical decision must prioritize:

- Stability
- Maintainability
- Scalability
- User Experience
- Performance
- Long-term development

Quick fixes that reduce future quality are not acceptable.

---

# 2. Current Project State

The project is already under active development.

This repository MUST be treated as an existing production codebase.

It is NOT a greenfield project.

Never restart completed work.

Never rebuild completed architecture.

Never replace stable systems without technical justification.

Development always continues from the latest approved checkpoint.

---

# 3. Approved Development History

The following phases are officially completed.

## Phase 1
Foundation

Completed:

- Project architecture
- Next.js App Router
- TypeScript
- Context system
- Build system
- Route generation
- SSR fixes
- Production build verification

Status:

APPROVED

---

## Phase 2.1
Design System

Completed:

- Semantic color tokens
- Component token migration
- Shared UI primitives
- Typography normalization
- Shadow system
- DESIGN_SYSTEM documentation

Status:

LOCKED

Do not redesign this system.

Only extend it when necessary.

---

## Phase 2.2
Premium Homepage & Navigation

Completed:

- Header
- TopBar
- Navbar
- Hero
- Search
- Categories
- Featured products
- Brands
- Experts
- Articles section
- Newsletter
- Homepage premium polish

Status:

APPROVED

This UI is considered the current official design language.

---

# 4. Current Development Phase

Current active phase:

Phase 2.3

UX Completion & Navigation Integrity

Only the remaining Phase 2.3 tasks may be implemented.

Do not jump ahead unless instructed.

---

# 5. Development Strategy

Before writing code:

Always:

1. Inspect existing implementation.

2. Understand current architecture.

3. Search for reusable components.

4. Extend existing systems.

Never create duplicate implementations.

---

# 6. Architecture Rules

Architecture consistency is more important than speed.

Never:

- duplicate components

- duplicate business logic

- duplicate layouts

- duplicate routes

Always reuse.

If extension is possible:

EXTEND

Do not REWRITE.

---

# 7. Component Rules

Every component must have:

Single responsibility.

Reusable API.

Consistent styling.

Semantic naming.

Minimal dependencies.

Avoid deeply nested logic.

Prefer composition over duplication.

---

# 8. Design Rules

The current Design System is the single source of truth.

Always use:

Semantic tokens.

Shared shadows.

Shared spacing.

Shared typography.

Existing animations.

Never introduce:

Random colors.

Random shadows.

Random spacing.

Unapproved gradients.

---

# 9. UI Consistency

Every page must visually belong to the same brand.

Luxury.

Minimal.

Clean.

Premium.

Avoid visual inconsistency between pages.

---

# 10. Routing Rules

Every visible navigation item must resolve to a real destination.

No placeholder buttons.

No dead links.

No fake pages.

Future dynamic pages must use:

/products/[slug]

/articles/[slug]

/brands/[slug]

/experts/[slug]

---

# 11. Data Rules

UI must never become the source of truth.

Business data belongs in centralized data structures.

Examples:

Products

Articles

Brands

Experts

Categories

Future CMS integration must be possible without rewriting UI.

---

# 12. Performance Rules

Performance is a permanent priority.

Avoid:

Unnecessary re-renders.

Large client bundles.

Repeated calculations.

Duplicate fetching.

Always prefer:

Server Components where appropriate.

Code splitting.

Lazy loading.

Image optimization.

---

# 13. Accessibility

Every feature should support:

Keyboard navigation.

Screen readers.

Visible focus states.

Proper ARIA attributes.

Color contrast.

RTL support.

---

# 14. SEO Rules

Every public page must be SEO-ready.

Support:

Metadata

Open Graph

Canonical URLs

Structured headings

Future structured data

Readable URLs

---

# 15. Security Rules

Never expose:

Secrets

API keys

Private credentials

Sensitive configuration

Always validate user input.

Never trust client-side values.

---

# 16. Code Quality Rules

Every phase must finish with:

npx tsc --noEmit

npm run lint

npm run build

No phase is considered complete until all pass successfully.

---

# 17. Documentation Rules

Important architectural decisions must be documented.

Do not rely on memory.

The repository must explain itself.

---

# 18. AI Development Rules

Any AI agent working on this repository must:

Continue existing work.

Respect completed phases.

Preserve architecture.

Preserve Design System.

Avoid unnecessary refactoring.

Deliver incremental improvements.

Never restart the project.

---

# 19. Future Roadmap

Phase 2.3

Navigation Integrity

Articles

Contact

Track Order

UX completion

Phase 3

Real Data Architecture

Products

Brands

Experts

Articles

CMS-ready structure

Phase 4

Commerce

Cart

Checkout

Orders

Customer accounts

Phase 5

Admin Dashboard

Inventory

Products

Articles

Experts

Brands

Orders

Customers

Phase 6

SEO

Performance

Deployment

Production hardening

---

# 20. Golden Rule

This project is developed by continuous evolution.

Never destroy completed work.

Always build on top of existing foundations.

The objective is not merely to finish the website.

The objective is to create a maintainable production platform capable of evolving for many years without architectural regression.