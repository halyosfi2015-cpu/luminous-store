import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'
import type { Database } from './supabase'

/**
 * Anonymous Supabase client for public read-only queries.
 * Does NOT use cookies, so it always runs as the `anon` role.
 * Use this for public storefront pages where the RLS policies
 * only grant SELECT to `anon` (not `authenticated`).
 */
export function createPublicSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/**
 * Server-only Supabase client that reads cookies from `next/headers`.
 * Do NOT import this module from Client Components — it depends on
 * server-only APIs (see `import 'server-only'` above).
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Next.js 16+ forbids cookies().set() in Server Components.
            // The setAll callback is only used by Supabase for auth token
            // refresh. Silently ignore — read-only pages don't need it.
          }
        },
      },
    },
  )
}
