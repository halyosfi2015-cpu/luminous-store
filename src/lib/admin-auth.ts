import { createAdminClient } from './supabase'
import { createServerSupabaseClient } from './supabase-server'

export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'content_manager'
  | 'product_manager'
  | 'order_manager'
  | 'support'

export interface AdminUser {
  id: string
  authId: string
  name: string
  role: AdminRole
  isActive: boolean
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const supabase = await withTimeout(createServerSupabaseClient(), 10000, null)
    if (!supabase) return null

    const { data: { session } } = await withTimeout(supabase.auth.getSession(), 8000, { data: { session: null }, error: null } as any)
    if (!session?.user) return null

    // admin_users RLS intentionally permits only the service_role client, so the
    // admin lookup must use createAdminClient() (service-role, server-side only).
    const adminClient = createAdminClient()
    const adminQuery = adminClient
      .from('admin_users')
      .select('*')
      .eq('auth_id', session.user.id)
      .eq('is_active', true)
      .single()
    const { data } = await withTimeout(adminQuery as any, 8000, { data: null, error: { message: 'timeout' } })

    if (!data) return null

    const row = data as unknown as {
      id: string
      auth_id: string
      name: string
      role: AdminRole
      is_active: boolean
    }

    return {
      id: row.id,
      authId: row.auth_id,
      name: row.name,
      role: row.role,
      isActive: row.is_active === true,
    }
  } catch {
    return null
  }
}

export function hasMinimumRole(role: AdminRole, required: AdminRole): boolean {
  const hierarchy: AdminRole[] = [
    'support',
    'order_manager',
    'product_manager',
    'content_manager',
    'admin',
    'super_admin',
  ]
  return hierarchy.indexOf(role) >= hierarchy.indexOf(required)
}

export async function requireAdmin(_request: Request): Promise<AdminUser | Response> {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return admin
}
