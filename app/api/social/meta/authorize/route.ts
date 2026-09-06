import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { buildAuthorizeUrl, newOAuthState } from "@/src/lib/social/meta-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Start Meta OAuth: admin-only, state cookie (CSRF), redirect to Meta dialog. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  let target: URL;
  try {
    target = new URL(buildAuthorizeUrl(request.nextUrl.origin, newOAuthState()));
  } catch (e) {
    return NextResponse.json(
      { error: { code: "meta_not_configured", message: e instanceof Error ? e.message : "Meta OAuth NOT CONFIGURED" } },
      { status: 503 },
    );
  }
  const state = target.searchParams.get("state") ?? "";
  const res = NextResponse.redirect(target);
  res.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
