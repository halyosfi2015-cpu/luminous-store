import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import {
  readLuminousStageOverrides,
  writeLuminousStageOverrides,
} from "@/src/lib/content-store";
import { sanitizeConfigs, resolveStageSlides } from "@/lib/luminous-stage";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  const file = readLuminousStageOverrides();
  const sanitized = sanitizeConfigs(file);
  return NextResponse.json({
    configs: sanitized,
    preview: sanitized ? resolveStageSlides(sanitized) : null,
  });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  try {
    const body = await request.json();
    if (body === null) {
      writeLuminousStageOverrides({ slides: [] });
      return NextResponse.json({ ok: true, reset: true });
    }
    const configs = sanitizeConfigs(body);
    if (!configs) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    writeLuminousStageOverrides({ slides: configs });
    return NextResponse.json({ ok: true, count: configs.length });
  } catch (error) {
    console.error("luminous-stage save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
