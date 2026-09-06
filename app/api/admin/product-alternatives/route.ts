/**
 * Admin API for product alternatives.
 *
 * GET    — fetch alternatives for a product
 * POST   — save alternatives (copy_price + family_alternative_id)
 * DELETE — clear alternatives for a product
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { createAdminClient } from "@/src/lib/supabase";

/** Resolve a text product ID (legacy_id like "yq-754") to a UUID. */
async function resolveProductId(supabase: any, textId: string): Promise<string | null> {
  // Already a UUID?
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(textId)) {
    return textId;
  }
  // Look up by legacy_id
  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("legacy_id", textId)
    .single();
  return data?.id ?? null;
}

// ─── GET ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  const productId = new URL(req.url).searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const supabase = createAdminClient() as any;

  // Resolve source product text ID → UUID
  const sourceUuid = await resolveProductId(supabase, productId);
  if (!sourceUuid) {
    return NextResponse.json({ copy_price: null, family_alternative_id: null });
  }

  const { data, error } = await supabase
    .from("product_alternatives")
    .select("*")
    .eq("source_product_id", sourceUuid)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  // Return legacy_ids for the admin UI (not UUIDs)
  const result = data ?? { copy_price: null, family_alternative_id: null };

  // Resolve UUIDs back to legacy_ids for the admin form
  if (result.family_alternative_id) {
    const { data: famProd } = await supabase
      .from("products")
      .select("legacy_id")
      .eq("id", result.family_alternative_id)
      .single();
    result.family_alternative_id = famProd?.legacy_id ?? result.family_alternative_id;
  }

  return NextResponse.json(result);
}

// ─── POST (save) ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sourceProductId, copyPrice, familyAlternativeId } = body as {
    sourceProductId?: string;
    copyPrice?: number | null;
    familyAlternativeId?: string | null;
  };

  if (!sourceProductId) {
    return NextResponse.json({ error: "sourceProductId is required" }, { status: 400 });
  }

  const supabase = createAdminClient() as any;

  // Resolve source product text ID → UUID
  const sourceUuid = await resolveProductId(supabase, sourceProductId);
  if (!sourceUuid) {
    return NextResponse.json({ error: "Source product not found" }, { status: 404 });
  }

  // Resolve and validate family product
  let familyUuid: string | null = null;
  if (familyAlternativeId && familyAlternativeId !== "") {
    familyUuid = await resolveProductId(supabase, familyAlternativeId);
    if (!familyUuid) {
      return NextResponse.json({ error: "Family alternative product not found" }, { status: 404 });
    }
    if (familyUuid === sourceUuid) {
      return NextResponse.json({ error: "Cannot set a product as its own family alternative" }, { status: 400 });
    }
  }

  // Upsert
  const { data: existing } = await supabase
    .from("product_alternatives")
    .select("id")
    .eq("source_product_id", sourceUuid)
    .single();

  const payload = {
    source_product_id: sourceUuid,
    copy_price: copyPrice && copyPrice > 0 ? copyPrice : null,
    family_alternative_id: familyUuid,
  };

  let result;
  if (existing) {
    result = await supabase
      .from("product_alternatives")
      .update(payload)
      .eq("source_product_id", sourceUuid)
      .select()
      .single();
  } else {
    result = await supabase
      .from("product_alternatives")
      .insert(payload)
      .select()
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: String(result.error) }, { status: 500 });
  }

  return NextResponse.json(result.data);
}

// ─── DELETE ─────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;

  const productId = new URL(req.url).searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const supabase = createAdminClient() as any;

  const sourceUuid = await resolveProductId(supabase, productId);
  if (!sourceUuid) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("product_alternatives")
    .delete()
    .eq("source_product_id", sourceUuid);

  if (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
