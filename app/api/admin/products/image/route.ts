import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createAdminClient } from "@/src/lib/supabase";
import { invalidateServerProductsCache } from "@/src/lib/server-products";

const PRODUCTS_DIR = path.join(process.cwd(), "public", "images", "products");

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const productId = formData.get("productId") as string | null;
    const imageUrl = formData.get("imageUrl") as string | null;
    const file = formData.get("file") as File | null;
    const galleryIndex = parseInt(formData.get("galleryIndex") as string ?? "0", 10);

    if (!productId) {
      return NextResponse.json({ error: { message: ".productId مطلوب" } }, { status: 400 });
    }

    if (!imageUrl && !file) {
      return NextResponse.json({ error: { message: "اختر صورة أو أدخل رابط" } }, { status: 400 });
    }

    if (!existsSync(PRODUCTS_DIR)) {
      await mkdir(PRODUCTS_DIR, { recursive: true });
    }

    let buffer: Buffer;

    if (file) {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } else {
      const res = await fetch(imageUrl!, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: { message: `فشل تحميل الصورة من الرابط (${res.status})` } },
          { status: 400 }
        );
      }
      const bytes = await res.arrayBuffer();
      buffer = Buffer.from(bytes);
    }

    if (!/^[A-Za-z0-9_-]+$/.test(productId)) {
      return NextResponse.json({ error: { message: "productId غير صالح" } }, { status: 400 });
    }

    // Admin table passes the DB UUID id, static catalog uses legacy_id (yq-*) —
    // resolve by either, otherwise the file lands under a wrong name and the
    // gallery update is silently skipped.
    type ResolvedProduct = { id: string; legacy_id: string | null; gallery: unknown };
    let product: ResolvedProduct | null = null;
    try {
      // Service-role: the live DB lacks SELECT/UPDATE grants for the
      // authenticated role on catalog tables (see db/fix_authenticated_grants.sql),
      // so the user-scoped client fails here. requireAdmin above already guards.
      const supabase = createAdminClient();
      // NOTE: products table has gallery/images/hero_image — there is NO
      // singular "image" column (42703 if selected).
      // NOTE 2: id is UUID — comparing it to a legacy yq-* value makes
      // PostgREST return 400 (invalid uuid syntax), so only include id.eq
      // when the value actually looks like a UUID.
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
      const orFilter = isUuid
        ? `id.eq.${productId},legacy_id.eq.${productId}`
        : `legacy_id.eq.${productId},slug.eq.${productId}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("products") as any)
        .select("id, legacy_id, gallery")
        .or(orFilter)
        .maybeSingle();
      if (error) throw error;
      product = data as ResolvedProduct | null;
    } catch (e) {
      console.warn("Failed to resolve product for image update:", e);
    }

    if (!product) {
      return NextResponse.json({ error: { message: "المنتج غير موجود في قاعدة البيانات — استورده أولاً من صفحة الاستيراد / التصدير" } }, { status: 404 });
    }

    const fileKey = product.legacy_id || product.id;
    // Pasted clipboard files often have an empty name — derive ext from MIME first.
    const mimeExt = file?.type === "image/jpeg" ? "jpg"
      : file?.type === "image/png" ? "png"
      : file?.type === "image/webp" ? "webp"
      : file?.type === "image/gif" ? "gif"
      : file?.type === "image/avif" ? "avif"
      : file?.type === "image/svg+xml" ? "svg"
      : null;
    const nameExt = file?.name?.includes(".") ? file.name.split(".").pop()?.toLowerCase() : null;
    const ext = mimeExt ?? (nameExt && /^[a-z0-9]{2,4}$/.test(nameExt) ? nameExt : "png");
    const filename = `${fileKey}.${ext}`;
    const filePath = path.join(PRODUCTS_DIR, filename);

    await writeFile(filePath, buffer);

    const newPath = `/images/products/${filename}`;

    try {
      const supabase = createAdminClient();
      const currentGallery = Array.isArray(product.gallery) ? [...product.gallery] : [];
      if (galleryIndex >= 0 && galleryIndex < currentGallery.length) {
        currentGallery[galleryIndex] = newPath;
      } else {
        currentGallery.unshift(newPath);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from("products") as any)
        .update({ gallery: currentGallery, hero_image: newPath })
        .eq("id", product.id);
      if (updateError) throw updateError;
    } catch (e) {
      console.warn("Failed to update product gallery in Supabase:", e);
      return NextResponse.json({ error: { message: "تم حفظ الملف لكن فشل تحديث قاعدة البيانات" } }, { status: 500 });
    }

    invalidateServerProductsCache();

    return NextResponse.json({
      success: true,
      productId,
      path: newPath,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "خطأ غير معروف";
    return NextResponse.json({ error: { message: msg } }, { status: 500 });
  }
}
