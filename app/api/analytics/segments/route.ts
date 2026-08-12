import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { createAdminClient } from '@/src/lib/supabase';
import { evaluateCustomerSegments } from '@/src/lib/analytics/segments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const supabase = createAdminClient();
  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .limit(500);

  const ids = (customers as unknown as Array<{ id: string }>).map((c) => c.id);
  const dist: Record<string, number> = {
    new_customer: 0,
    returning_customer: 0,
    cart_abandoner: 0,
    category_interest: 0,
    high_intent: 0,
    high_value: 0,
    at_risk: 0,
    inactive: 0,
  };

  for (const id of ids) {
    const ev = await evaluateCustomerSegments(id);
    for (const s of ev.segments) dist[s] = (dist[s] ?? 0) + 1;
  }

  return NextResponse.json({
    total_customers: ids.length,
    distribution: dist,
  });
}
