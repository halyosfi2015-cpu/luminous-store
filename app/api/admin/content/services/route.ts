import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import {
  readServicesOverrides,
  writeServicesOverrides,
  type ServiceItemOverride,
} from "@/src/lib/content-store";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  return NextResponse.json(readServicesOverrides());
}

function sanitizeItem(raw: unknown): ServiceItemOverride | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id.trim()) return null;
  return {
    id: r.id,
    titleAr: typeof r.titleAr === "string" ? r.titleAr : "",
    titleEn: typeof r.titleEn === "string" ? r.titleEn : "",
    descAr: typeof r.descAr === "string" ? r.descAr : "",
    descEn: typeof r.descEn === "string" ? r.descEn : "",
    featuresAr: typeof r.featuresAr === "string" ? r.featuresAr : "",
    featuresEn: typeof r.featuresEn === "string" ? r.featuresEn : "",
    icon: typeof r.icon === "string" ? r.icon : "Sparkles",
    href: typeof r.href === "string" ? r.href : "/contact",
    available: r.available === true,
    hidden: r.hidden === true,
    image: typeof r.image === "string" ? r.image : undefined,
    taglineAr: typeof r.taglineAr === "string" ? r.taglineAr : undefined,
    taglineEn: typeof r.taglineEn === "string" ? r.taglineEn : undefined,
    displayOrder: typeof r.displayOrder === "number" ? r.displayOrder : undefined,
  };
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const items = body.items.map(sanitizeItem).filter(Boolean);
    writeServicesOverrides({ items });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("services save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
