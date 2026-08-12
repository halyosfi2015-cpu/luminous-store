import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { createAdminClient } from '@/src/lib/supabase';
import { evaluatePurchaseIntent } from '@/src/lib/analytics/intent';

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
  const dist: Record<string, number> = { low: 0, medium: 0, high: 0, very_high: 0 };

  for (const id of ids) {
    const ev = await evaluatePurchaseIntent(id, null);
    dist[ev.level]++;
  }

  return NextResponse.json({
    total_evaluated: ids.length,
    distribution: dist,
  });
}
