import { NextRequest, NextResponse } from "next/server";
import { getContentStore, persistContentStore } from "@/src/lib/content-ops/store";
import { publishDueItems } from "@/src/lib/content-ops/operations";
import { createConfiguredPublisherRegistry } from "@/src/lib/social/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PART 2 / P6 — Real scheduling execution endpoint (cron-compatible).
 * Triggered by the platform scheduler (see vercel.json `crons`) or any
 * external cron hitting:
 *   GET /api/cron/publish-due  (Authorization: Bearer <CRON_SECRET>)
 * Executes the SAME publishDueItems() the manual «نشر المستحق» button uses:
 * Approved → Scheduled → (due) → Publishing → Published / Failed.
 * Every transition is persisted; social channels without credentials fail
 * honestly as PUBLISH_FAILED (CHANNEL_NOT_CONNECTED) — never faked.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: { code: "not_configured", message: "CRON_SECRET is not set — scheduled execution is NOT CONFIGURED" } },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  const qs = new URL(request.url).searchParams.get("secret") ?? "";
  if (auth !== `Bearer ${secret}` && qs !== secret) {
    return NextResponse.json({ error: { code: "forbidden", message: "invalid cron secret" } }, { status: 403 });
  }
  const store = await getContentStore();
  const registry = await createConfiguredPublisherRegistry();
  const res = await publishDueItems(store, (ch) => registry.get(ch), { actor: "cron" });
  await persistContentStore(store);
  return NextResponse.json({ ok: true, ...res });
}
