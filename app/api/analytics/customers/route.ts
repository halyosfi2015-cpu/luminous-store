import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { getCustomerProfile, listCustomerProfiles } from '@/src/lib/analytics/profile';
import { evaluateCustomerSegments, evaluateCustomerSegmentsBatch } from '@/src/lib/analytics/segments';
import { evaluatePurchaseIntent, evaluatePurchaseIntentBatch } from '@/src/lib/analytics/intent';
import { getCustomerIntelligence, getBatchCustomerIntelligence, getIntelligenceOverview } from '@/src/lib/analytics/customer-intelligence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const customerId = url.searchParams.get('customer_id');
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? '50')));
  const mode = url.searchParams.get('mode');

  // Overview mode
  if (mode === 'overview') {
    const overview = await getIntelligenceOverview();
    return NextResponse.json(overview);
  }

  // Single customer mode
  if (customerId) {
    const profile = await getCustomerProfile(customerId);
    if (!profile) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const segments = await evaluateCustomerSegments(customerId);
    const intent = await evaluatePurchaseIntent(customerId, null);
    const intelligence = await getCustomerIntelligence(customerId);
    return NextResponse.json({ profile, segments, intent, intelligence });
  }

  // List mode
  const profiles = await listCustomerProfiles(limit);
  const customerIds = profiles.map((p) => p.customer_id);

  const [segmentsMap, intentMap, intelligenceMap] = await Promise.all([
    evaluateCustomerSegmentsBatch(customerIds),
    evaluatePurchaseIntentBatch(customerIds),
    getBatchCustomerIntelligence(customerIds),
  ]);

  const enriched = profiles.map((profile) => {
    const segments = segmentsMap.get(profile.customer_id) ?? { customer_id: profile.customer_id, segments: [], reasons: {}, rules_version: 'phase_6_2_v1' };
    const intent = intentMap.get(profile.customer_id) ?? {
      customer_id: profile.customer_id,
      session_id: null,
      score: 0,
      level: 'low',
      signals: {
        product_views: 0, repeat_product_views: 0, wishlist_adds: 0, cart_adds: 0,
        cart_removes: 0, checkout_started: 0, checkout_failed: 0, purchases: 0,
        recent_sessions: 0, browse_depth: 0,
      },
      contributors: [],
      rules_version: 'phase_6_2_v1',
      evaluated_at: new Date().toISOString(),
    };
    const intelligence = intelligenceMap.get(profile.customer_id) ?? null;
    return { profile, segments, intent, intelligence };
  });

  return NextResponse.json({ items: enriched });
}
