import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/src/lib/admin-auth'

/**
 * Admin "who am I" endpoint.
 * Resolves the current Supabase Auth session against admin_users (server-side,
 * service-role) and returns the matching active admin record, or 401.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin instanceof Response) return admin
  return NextResponse.json({ admin })
}
