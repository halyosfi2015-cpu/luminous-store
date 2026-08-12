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

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null

    // admin_users RLS intentionally permits only the service_role client, so the
    // admin lookup must use createAdminClient() (service-role, server-side only).
    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from('admin_users')
      .select('*')
      .eq('auth_id', session.user.id)
      .eq('is_active', true)
      .single()

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
