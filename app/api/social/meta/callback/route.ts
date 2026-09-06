import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { processOAuthCallback } from "@/src/lib/social/meta-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Meta OAuth callback: verify state (CSRF), require admin, exchange code. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  const params = request.nextUrl.searchParams;
  const state = params.get("state") ?? "";
  const expected = request.cookies.get("meta_oauth_state")?.value ?? "";
  const code = params.get("code") ?? "";
  const metaError = params.get("error_description") ?? params.get("error") ?? "";
  const clearState = (res: NextResponse) => {
    res.cookies.set("meta_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  };
  if (metaError) {
    return clearState(
      NextResponse.redirect(new URL(`/admin/ai/content/settings?meta_error=${encodeURIComponent(metaError)}`, request.nextUrl.origin)),
    );
  }
  if (!state || !expected || state !== expected) {
    return clearState(NextResponse.json({ error: { code: "invalid_state", message: "OAuth state mismatch — أعد المحاولة" } }, { status: 403 }));
  }
  if (!code) {
    return clearState(NextResponse.json({ error: { code: "missing_code", message: "لا يوجد رمز تفويض من ميتا" } }, { status: 400 }));
  }
  try {
    const { pendingId } = await processOAuthCallback(code, request.nextUrl.origin);
    const res = NextResponse.redirect(
      new URL(`/admin/ai/content/settings?meta_pending=${pendingId}`, request.nextUrl.origin),
    );
    return clearState(res);
  } catch (e) {
    return clearState(
      NextResponse.json(
        { error: { code: "oauth_failed", message: e instanceof Error ? e.message : "فشل تفويض ميتا" } },
        { status: 502 },
      ),
    );
  }
}
