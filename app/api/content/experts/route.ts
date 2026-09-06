import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function mapExpertRow(row: Row) {
  return {
    id: asString(row.id),
    slug: asString(row.slug),
    name: asString(row.name),
    nameAr: asString(row.name_ar) || asString(row.name),
    title: asString(row.title),
    titleAr: asString(row.title_ar),
    specialty: asString(row.specialty),
    specialtyAr: asString(row.specialty_ar),
    bio: asString(row.bio),
    bioAr: asString(row.bio_ar),
    shortBio: asString(row.short_bio) || undefined,
    shortBioAr: asString(row.short_bio_ar) || undefined,
    profileImage: asString(row.profile_image),
    coverImage: asString(row.cover_image),
    avatar: asString(row.avatar) || undefined,
    gender: row.gender === "female" ? "female" : "male",
    languages: Array.isArray(row.languages) ? (row.languages as string[]) : [],
    consultationTypes: Array.isArray(row.consultation_types) ? (row.consultation_types as string[]) : [],
    services: Array.isArray(row.services) ? (row.services as string[]) : [],
    products: [] as string[],
    articles: [] as string[],
    specialties: Array.isArray(row.specialties_arr) ? (row.specialties_arr as string[]) : [],
    specialtiesAr: Array.isArray(row.specialties_ar) ? (row.specialties_ar as string[]) : [],
    isVerified: row.is_verified === true,
    availableForConsultation: row.available_for_consultation !== false,
    rating: asNumber(row.rating, 0),
    reviewCount: asNumber(row.review_count, 0),
    isFeatured: row.is_featured === true,
    city: asString(row.city) || undefined,
    cityAr: asString(row.city_ar) || undefined,
    socialLinks: Array.isArray(row.social_links) ? row.social_links : [],
  };
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminClient() as any;
    const { data, error } = await supabase
      .from("experts")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;

    const experts = ((data ?? []) as Row[]).map(mapExpertRow);

    return NextResponse.json(
      { experts },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  } catch (err) {
    console.error("experts content fetch error:", err);
    return NextResponse.json(
      { experts: [] },
      { headers: { "Cache-Control": "no-store, must-revalidate" } }
    );
  }
}
