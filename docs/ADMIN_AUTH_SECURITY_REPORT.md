# Security Report — Admin Authentication (Real Session Required)

## Summary

The admin panel previously relied on **simulated** admin identity: the client-only
`AdminDataProvider` minted an `AdminSession` locally (hardcoded `super_admin`), and
the admin UI's recover flow called `loginAs("super_admin")` to impersonate the top
role with zero authentication. That allowed **any visitor** to reach admin UI and
triggers. This change requires a **real Supabase Auth session** bound to an **active
`admin_users` record** before any admin page renders.

## Security-sensitive change

- **Before:** `AdminDataProvider` resolved sessions purely client-side (localStorage
  check + hardcoded role). No server check. `loginAs()` impersonated roles freely.
- **After:** session resolution is delegated to a new **server-side** endpoint
  `GET /api/admin/me`, guarded by `requireAdmin()`, which:
  1. Reads the real Supabase Auth session via `createServerSupabaseClient()` (cookie-based).
  2. Looks up the matching **active** `admin_users` row by `auth_id` using
     `createAdminClient()` (service-role, **server-only**).
  3. Returns 401 unless the authenticated user is an active admin.
- The admin UI now shows a **login form** when no session exists, and `loginAs` is
  replaced by `previewRole`, which is a **no-op without a real session** and can only
  re-label an already-authenticated admin (a UX tool, not a privilege escalation path).

## Files changed

| File | Change |
|------|--------|
| `src/lib/admin-auth.ts` | Added `getCurrentAdmin()` (server-side, service-role lookup); kept `requireAdmin()` behavior. |
| `app/api/admin/me/route.ts` | New `GET` endpoint returning the resolved admin or 401. |
| `app/api/admin/[...resource]/route.ts` | Hardened: `requireAdmin` added to `dispatch()` for all methods (was unauthenticated). |
| `src/admin/AdminDataProvider.tsx` | Resolution now calls `/api/admin/me`; `loginAs` → `previewRole` (gated on real session). |
| `src/admin/AdminShell.tsx` | Added loading + login-gate; removed `loginAs("super_admin")` recover. |
| `components/admin/shell/AdminLoginForm.tsx` | New Supabase email/password login form. |
| `components/admin/shell/AdminHeader.tsx` | Added sign-out button. |
| `components/admin/UsersAdmin.tsx` | Switched to `previewRole`. |
| `src/lib/supabase-server.ts` | **New** server-only module hosting `createServerSupabaseClient()` (`import 'server-only'`). |
| `src/lib/supabase.ts` | Removed `next/headers`/server client so the module stays client-bundle-safe. |
| `src/lib/admin-supabase.ts` | Import updated to `supabase-server`. |

## Scope decision — generic admin API

`/api/admin/[...resource]` initially had **no `requireAdmin` guard**. It is now
**hardened**: `dispatch()` calls `requireAdmin(request)` before dispatching any
GET/POST/PUT/DELETE handler, so every read and write through the generic route
requires a real, active admin session (401 otherwise). This was safe to add because
every caller of this route is an admin-only UI component (`components/admin/*`,
`src/admin/*`) that already sits behind the AdminShell login gate, and their
`res.ok` fallbacks handle 401s gracefully.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run build` — `✓ Compiled successfully` (note: takes ~11 min).
- ESLint — no new issues in changed files (remaining errors are pre-existing in
  `db/verify-phase642.js`, `admin-supabase.ts`, etc.).
- Note: the pre-existing production-build failure (server-only `next/headers` import
  reachable from a client component) was **fixed** via the `supabase-server.ts` split.

## Deployment notes

- Requires `SUPABASE_SERVICE_ROLE_KEY` set server-side (already used by existing
  admin DB scripts). The service key **must never** be exposed to the client — it now
  also backs the `admin_users` lookup.
- Seed at least one row in `admin_users` (`auth_id` = the Supabase Auth user's id,
  `is_active = true`) or the login form will reject valid accounts.
