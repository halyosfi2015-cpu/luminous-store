import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import {
  readProblemSolutionsOverrides,
  writeProblemSolutionsOverrides,
  type ProblemSolutionItem,
} from "@/src/lib/content-store";

function sanitizeItem(raw: unknown): ProblemSolutionItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id.trim()) return null;
  const asStr = (v: unknown, fb = ""): string => (typeof v === "string" ? v : fb);
  const asArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return {
    id: r.id,
    labelAr: asStr(r.labelAr, asStr(r.titleAr)),
    labelEn: asStr(r.labelEn, asStr(r.titleEn)),
    taglineAr: asStr(r.taglineAr),
    taglineEn: asStr(r.taglineEn),
    descAr: asStr(r.descAr, asStr(r.descriptionAr)),
    descEn: asStr(r.descEn, asStr(r.descriptionEn)),
    image: asStr(r.image),
    accent: asStr(r.accent, "#7c3aed"),
    accentBg: asStr(r.accentBg, "rgba(124,58,237,0.08)"),
    emoji: asStr(r.emoji, "🔍"),
    routineAr: asArr(r.routineAr),
    routineEn: asArr(r.routineEn),
    hidden: r.hidden === true,
    displayOrder: typeof r.displayOrder === "number" ? r.displayOrder : undefined,
  };
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  return NextResponse.json(readProblemSolutionsOverrides());
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;
  try {
    const body = await request.json();
    if (!body || (!Array.isArray(body.items) && typeof body.productOverrides !== "object")) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    // Merge over existing so items/productOverrides can be saved independently.
    const current = readProblemSolutionsOverrides();
    const items = Array.isArray(body.items)
      ? body.items.map(sanitizeItem).filter(Boolean)
      : current.items;
    const productOverrides =
      body.productOverrides && typeof body.productOverrides === "object"
        ? body.productOverrides
        : current.productOverrides;
    writeProblemSolutionsOverrides({ items, productOverrides });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("problemSolutions save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}