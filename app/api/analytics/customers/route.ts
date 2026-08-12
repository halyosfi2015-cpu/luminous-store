import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { getCustomerProfile, listCustomerProfiles } from '@/src/lib/analytics/profile';
import { evaluateCustomerSegments } from '@/src/lib/analytics/segments';
import { evaluatePurchaseIntent } from '@/src/lib/analytics/intent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const customerId = url.searchParams.get('customer_id');
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? '50')));

  if (customerId) {
    const profile = await getCustomerProfile(customerId);
    if (!profile) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const segments = await evaluateCustomerSegments(customerId);
    const intent = await evaluatePurchaseIntent(customerId, null);
    return NextResponse.json({ profile, segments, intent });
  }

  const profiles = await listCustomerProfiles(limit);
  const enriched = await Promise.all(
    profiles.map(async (profile) => {
      const segments = await evaluateCustomerSegments(profile.customer_id);
      const intent = await evaluatePurchaseIntent(profile.customer_id, null);
      return { profile, segments, intent };
    }),
  );

  return NextResponse.json({ items: enriched });
}
