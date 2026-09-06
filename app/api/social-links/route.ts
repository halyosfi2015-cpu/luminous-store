import { NextResponse } from "next/server";
import { getContentStore } from "@/src/lib/content-ops/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/social-links
 * Returns the social links from the persisted ContentOpsSettings.
 * Used by the Footer to display social media links from persisted settings.
 */
export async function GET() {
  const store = await getContentStore();
  const settings = store.settings;

  // Build social links from persisted settings
  const socialLinks = [
    {
      platform: "instagram",
      url: settings.instagramUrl || "",
      label: "Instagram",
    },
    {
      platform: "facebook",
      url: settings.facebookUrl || "",
      label: "Facebook",
    },
    {
      platform: "tiktok",
      url: settings.tiktokUrl || "",
      label: "TikTok",
    },
    {
      platform: "youtube",
      url: settings.youtubeUrl || "",
      label: "YouTube",
    },
  ];

  return NextResponse.json(
    { socialLinks },
    {
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}