import { NextRequest, NextResponse } from 'next/server';
import { readConsentCookie, writeConsentCookie } from '@/src/lib/analytics/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const granted = await readConsentCookie();
  return NextResponse.json({ granted });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const granted = body.granted === true;
  await writeConsentCookie(granted);
  return NextResponse.json({ granted });
}
