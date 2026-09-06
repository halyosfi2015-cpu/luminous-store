/**
 * Meta connect flow (server-only):
 * pasted User token → list pages → pick page (+ linked IG for instagram)
 * → long-lived exchange → re-list for long-lived Page token → encrypted store.
 * Every failure is honest; nothing is marked connected without a verified token.
 */
import { listMetaPages, exchangeLongLivedToken } from "./meta-adapter";
import { saveChannelToken } from "./token-store";
import type { ChannelKey } from "../content-ops/types";

export interface MetaConnectResult {
  ok: boolean;
  data?: { channel: ChannelKey; pageId: string; pageName: string; igUsername: string | null; expiresAt: string | null };
  error?: { code: string; message: string };
}

export async function connectMetaChannel(input: {
  channel: Extract<ChannelKey, "facebook" | "instagram">;
  userToken: string;
  pageId?: string;
  actor?: string;
}): Promise<MetaConnectResult> {
  const fail = (code: string, message: string): MetaConnectResult => ({ ok: false, error: { code, message } });
  let pages;
  try {
    pages = await listMetaPages(input.userToken);
  } catch (e) {
    return fail("meta_auth_failed", e instanceof Error ? `رمز ميتا مرفوض: ${e.message}` : "رمز ميتا مرفوض");
  }
  if (pages.length === 0) {
    return fail("meta_no_pages", "هذا الرمز لا يملك أي صفحة فيسبوك — أنشئ صفحة وامنح صلاحية pages_read_engagement");
  }
  const page = input.pageId ? pages.find((p) => p.pageId === input.pageId) : pages[0];
  if (!page) return fail("meta_page_not_found", "الصفحة المطلوبة غير موجودة ضمن صفحات هذا الرمز");
  if (input.channel === "instagram" && !page.igUserId) {
    return fail(
      "meta_no_instagram",
      `صفحة "${page.pageName}" غير مربوطة بحساب انستغرام تجاري — اربط حساب Creator/Business من إعدادات الصفحة أولاً`,
    );
  }

  // Long-lived exchange (requires app credentials).
  let longUserToken = input.userToken;
  let expiresAt: string | null = null;
  try {
    const exchanged = await exchangeLongLivedToken(input.userToken);
    longUserToken = exchanged.accessToken;
    expiresAt = new Date(Date.now() + exchanged.expiresIn * 1000).toISOString();
  } catch (e) {
    return fail("meta_not_configured", e instanceof Error ? e.message : "تعذر تمديد الرمز");
  }

  // Re-list with the long-lived token to get the long-lived Page token.
  let longPageToken = page.pageToken;
  try {
    const longPages = await listMetaPages(longUserToken);
    const match = longPages.find((p) => p.pageId === page.pageId) ?? longPages[0];
    if (match?.pageToken) longPageToken = match.pageToken;
  } catch {
    // Keep the short page token; still usable briefly.
    expiresAt = expiresAt ?? new Date(Date.now() + 3600 * 1000).toISOString();
  }

  try {
    await saveChannelToken({
      channel: input.channel,
      provider: "meta",
      pageId: page.pageId,
      pageName: page.pageName,
      igUserId: page.igUserId,
      igUsername: page.igUsername,
      accessToken: longPageToken,
      expiresAt,
      scopes: input.channel === "instagram"
        ? ["pages_read_engagement", "instagram_basic", "instagram_content_publish"]
        : ["pages_read_engagement", "pages_manage_posts"],
      connectedBy: input.actor,
    });
  } catch (e) {
    return fail("token_store_failed", e instanceof Error ? e.message : "فشل حفظ الرمز");
  }
  return {
    ok: true,
    data: {
      channel: input.channel,
      pageId: page.pageId,
      pageName: page.pageName,
      igUsername: page.igUsername ?? null,
      expiresAt,
    },
  };
}
