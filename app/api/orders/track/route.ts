import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase";

/**
 * GUEST ORDER TRACKING
 * Looks up an order by order number + phone (no login required).
 * Uses the service-role client server-side; RLS on orders stays locked.
 * Phone comparison is digit-normalized (last 9 digits) to tolerate
 * +967 prefixes, spaces and dashes.
 */

function fail(status: number, code: string, messageAr: string) {
  return NextResponse.json({ error: { code, message: messageAr } }, { status });
}

function normalizePhone(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length > 9 ? digits.slice(-9) : digits;
}

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  discount_total: number;
  total: number;
  created_at: string;
  shipping_address: { phone?: unknown } | null;
};

type ItemRow = {
  product_name_ar: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      orderNumber?: unknown;
      phone?: unknown;
    };
    const rawNumber = String(body.orderNumber ?? "").trim();
    if (!rawNumber || rawNumber.length > 64) {
      return fail(400, "invalid_request", "رقم الطلب غير صالح");
    }
    // Case-insensitive match (order suffix is lowercase hex; users may type
    // upper case). Escape LIKE wildcards first.
    const orderNumber = rawNumber.replace(/[\\%_]/g, (c) => `\\${c}`);
    const phone = normalizePhone(body.phone);
    if (phone.length < 7) {
      return fail(400, "invalid_request", "رقم الهاتف غير صالح");
    }

    const db = createAdminClient();
    const { data: orderData, error: orderError } = await (db as any)
      .from("orders")
      .select("id, order_number, status, subtotal, shipping_fee, discount_total, total, created_at, shipping_address")
      .ilike("order_number", orderNumber)
      .maybeSingle();
    if (orderError || !orderData) {
      return fail(404, "order_not_found", "لم يتم العثور على الطلب. تأكد من رقم الطلب.");
    }
    const order = orderData as OrderRow;
    const orderPhone = normalizePhone(order.shipping_address?.phone);
    if (!orderPhone || orderPhone !== phone) {
      // Same response as not-found (don't leak which part mismatched).
      return fail(404, "order_not_found", "لم يتم العثور على الطلب. تأكد من رقم الطلب ورقم الهاتف.");
    }

    const { data: itemsData } = await (db as any)
      .from("order_items")
      .select("product_name_ar, quantity, unit_price, total_price")
      .eq("order_id", order.id);
    const items = ((itemsData ?? []) as ItemRow[]).map((it) => ({
      product_name_ar: it.product_name_ar,
      quantity: it.quantity,
      unit_price: it.unit_price,
      total_price: it.total_price,
    }));

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        subtotal: order.subtotal,
        shipping_fee: order.shipping_fee,
        discount_total: order.discount_total,
        total: order.total,
        created_at: order.created_at,
      },
      items,
    });
  } catch {
    return NextResponse.json(
      { error: { code: "internal_error", message: "خطأ داخلي في الخادم" } },
      { status: 500 }
    );
  }
}
