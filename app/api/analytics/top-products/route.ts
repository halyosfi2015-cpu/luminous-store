import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { getTopProducts } from '@/src/lib/analytics/aggregations';
import type { AnalyticsRange } from '@/src/lib/analytics/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID: AnalyticsRange[] = ['today', '7d', '30d', '90d'];

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const rangeParam = (url.searchParams.get('range') ?? '7d') as AnalyticsRange;
  const range: AnalyticsRange = VALID.includes(rangeParam) ? rangeParam : '7d';
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '10')));

  return NextResponse.json(await getTopProducts(range, limit));
}
