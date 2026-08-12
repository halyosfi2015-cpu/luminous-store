import { NextRequest, NextResponse } from 'next/server';
import { trackEvent } from '@/src/lib/analytics/events';
import { readConsentCookie, writeConsentCookie } from '@/src/lib/analytics/events';
import type { AnalyticsEventInput } from '@/src/lib/analytics/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 });
  }

  const consentHeader = request.headers.get('x-analytics-consent');
  const consentCookie = await readConsentCookie();
  const consent = consentHeader !== null ? consentHeader === '1' || consentHeader === 'true' : consentCookie;

  if (body.consent !== undefined) {
    await writeConsentCookie(body.consent === true);
  }

  const input: AnalyticsEventInput = {
    event_type: body.event_type as AnalyticsEventInput['event_type'],
    event_name: (body.event_name as string | undefined) ?? null,
    entity_type: (body.entity_type as string | undefined) ?? null,
    entity_id: (body.entity_id as string | undefined) ?? null,
    properties: (body.properties as Record<string, unknown> | undefined) ?? {},
    source: 'web',
    occurred_at: (body.occurred_at as string | undefined) ?? new Date().toISOString(),
    customer_id: (body.customer_id as string | undefined) ?? null,
    session_id: (body.session_id as string | undefined) ?? null,
  };

  const result = await trackEvent(input, {
    consent,
    customer_id: (body.customer_id as string | undefined) ?? null,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 202 });
}
