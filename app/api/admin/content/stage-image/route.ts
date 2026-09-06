import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";

/**
 * Stage custom-image upload (admin only).
 * Stores the file under public/uploads/stage/ and returns its public URL.
 * NOTE: filesystem storage works on a persistent server; on serverless hosts
 * this must move to object storage (documented deployment gap).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  if (!canEdit(admin.role)) {
    return NextResponse.json({ error: { code: "forbidden", message: "Permission denied" } }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: { code: "invalid_request", message: "طلب غير صالح" } }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "invalid_request", message: "لم يتم إرسال ملف" } }, { status: 422 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: { code: "invalid_type", message: "صيغة غير مدعومة (JPG/PNG/WebP/SVG فقط)" } }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: { code: "too_large", message: "الحد الأقصى 5MB" } }, { status: 422 });
  }

  const dir = path.join(process.cwd(), "public", "uploads", "stage");
  mkdirSync(dir, { recursive: true });
  const name = `stage-${Date.now()}-${randomBytes(3).toString("hex")}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  writeFileSync(path.join(dir, name), bytes);

  return NextResponse.json({ success: true, url: `/content-uploads/${name}` });
}

function canEdit(role: string): boolean {
  // Content managers and above may curate the stage.
  return ["super_admin", "admin", "content_manager"].includes(role);
}
