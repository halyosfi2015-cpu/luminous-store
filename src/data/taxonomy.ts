import type { TaxonomyNode } from "@/src/types/taxonomy";
import taxonomyOverrides from "./content/taxonomy.json";
import {
  mergeTaxonomyOverrides as applyTaxonomyOverrides,
  customNodeSlugs,
  type TaxonomyOverridesInput,
} from "../lib/taxonomy-merge";

/**
 * Custom taxonomy overrides — written permanently to src/data/content/taxonomy.json
 * by the admin taxonomy editor. Merged over the base taxonomy at module load
 * (build time) so every consumer (nav, home, category pages) reflects the edits.
 */
const OVERRIDES = taxonomyOverrides as TaxonomyOverridesInput;

/**
 * ============================================================================
 * MASTER CATEGORY TAXONOMY — LUMINOUS DERMA
 * ============================================================================
 * This is the SINGLE SOURCE OF TRUTH for product classification & navigation.
 * 12 top-level categories → SUBCATEGORY → PRODUCT_TYPE.
 *
 * Rules enforced by this file (see scripts/taxonomy/validate-taxonomy.mjs):
 *  - unique ids and slugs
 *  - no circular hierarchy, valid parents, no orphan nodes
 *  - every PRODUCT_TYPE has a valid SUBCATEGORY parent
 *  - status is one of ACTIVE / FUTURE / HIDDEN
 *
 * `legacySlugs` lists previous classification slugs that map onto this node
 * (used to build 301 redirects and to translate old product categorySlug data).
 * ============================================================================
 */
export const BASE_TAXONOMY: TaxonomyNode[] = [
  /* ───────────────────────── 01. العناية بالبشرة ───────────────────────── */
  { id: "tax-skincare", parentId: null, slug: "skincare", nameAr: "العناية بالبشرة", nameEn: "Skincare", type: "CATEGORY", order: 1, status: "ACTIVE", icon: "sparkles", descriptionAr: "روتينات عناية كاملة بالبشرة لكل الاهتمامات", descriptionEn: "Complete skincare routines for every concern" },
  { id: "tax-skincare-face", parentId: "tax-skincare", slug: "face-care", nameAr: "العناية بالوجه", nameEn: "Face Care", type: "SUBCATEGORY", order: 1, status: "ACTIVE", icon: "droplets", descriptionAr: "منظفات وتونرات وسيرومات ومرطبات للوجه", descriptionEn: "Cleansers, toners, serums and moisturizers for the face" },
  { id: "tax-skincare-face-cleansers", parentId: "tax-skincare-face", slug: "cleansers", nameAr: "غسولات الوجه", nameEn: "Face Cleansers", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE", legacySlugs: ["cleansers"] },
  { id: "tax-skincare-face-toners", parentId: "tax-skincare-face", slug: "toners", nameAr: "تونر ومياه الوجه", nameEn: "Toners & Mists", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE", legacySlugs: ["toners"] },
  { id: "tax-skincare-face-serums", parentId: "tax-skincare-face", slug: "serums", nameAr: "السيرومات", nameEn: "Serums", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE", legacySlugs: ["serums"] },
  { id: "tax-skincare-face-moisturizers", parentId: "tax-skincare-face", slug: "moisturizers", nameAr: "المرطبات", nameEn: "Moisturizers", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE", legacySlugs: ["moisturizers"] },
  { id: "tax-skincare-face-creams", parentId: "tax-skincare-face", slug: "face-creams", nameAr: "كريمات الوجه", nameEn: "Face Creams", type: "PRODUCT_TYPE", order: 5, status: "ACTIVE" },
  { id: "tax-skincare-face-oils", parentId: "tax-skincare-face", slug: "face-oils-treatments", nameAr: "الزيوت والعلاجات", nameEn: "Face Oils & Treatments", type: "PRODUCT_TYPE", order: 6, status: "ACTIVE" },
  { id: "tax-skincare-face-masks", parentId: "tax-skincare-face", slug: "masks", nameAr: "الماسكات", nameEn: "Masks", type: "PRODUCT_TYPE", order: 7, status: "ACTIVE", legacySlugs: ["masks"] },
  { id: "tax-skincare-face-exfoliators", parentId: "tax-skincare-face", slug: "exfoliators", nameAr: "المقشرات", nameEn: "Exfoliators", type: "PRODUCT_TYPE", order: 8, status: "ACTIVE", legacySlugs: ["exfoliators"] },
  { id: "tax-skincare-face-specialized", parentId: "tax-skincare-face", slug: "specialized-treatments", nameAr: "العلاجات المتخصصة", nameEn: "Specialized Treatments", type: "PRODUCT_TYPE", order: 9, status: "FUTURE" },
  { id: "tax-skincare-eye", parentId: "tax-skincare", slug: "eye-area", nameAr: "العناية بمحيط العين", nameEn: "Eye Area Care", type: "SUBCATEGORY", order: 2, status: "ACTIVE", icon: "eye", legacySlugs: ["eye-care"], descriptionAr: "كريمات وسيرومات وماسكات خاصة بمحيط العين", descriptionEn: "Creams, serums and masks for the delicate eye area" },
  { id: "tax-skincare-eye-creams", parentId: "tax-skincare-eye", slug: "eye-creams", nameAr: "كريمات العين", nameEn: "Eye Creams", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-skincare-eye-serums", parentId: "tax-skincare-eye", slug: "eye-serums", nameAr: "سيرومات العين", nameEn: "Eye Serums", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-skincare-eye-masks", parentId: "tax-skincare-eye", slug: "eye-masks", nameAr: "ماسكات العين", nameEn: "Eye Masks", type: "PRODUCT_TYPE", order: 3, status: "FUTURE" },
  { id: "tax-skincare-lips", parentId: "tax-skincare", slug: "lip-care", nameAr: "العناية بالشفاه", nameEn: "Lip Care", type: "SUBCATEGORY", order: 3, status: "ACTIVE", icon: "heart", legacySlugs: ["lip-care"], descriptionAr: "مرطبات وماسكات ومقشرات وعلاجات للشفاه", descriptionEn: "Balms, masks, scrubs and treatments for lips" },
  { id: "tax-skincare-lip-balms", parentId: "tax-skincare-lips", slug: "lip-balms", nameAr: "مرطبات الشفاه", nameEn: "Lip Balms", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-skincare-lip-masks", parentId: "tax-skincare-lips", slug: "lip-masks", nameAr: "ماسكات الشفاه", nameEn: "Lip Masks", type: "PRODUCT_TYPE", order: 2, status: "FUTURE" },
  { id: "tax-skincare-lip-scrubs", parentId: "tax-skincare-lips", slug: "lip-scrubs", nameAr: "مقشرات الشفاه", nameEn: "Lip Scrubs", type: "PRODUCT_TYPE", order: 3, status: "FUTURE" },
  { id: "tax-skincare-lip-treatments", parentId: "tax-skincare-lips", slug: "lip-treatments", nameAr: "علاجات الشفاه", nameEn: "Lip Treatments", type: "PRODUCT_TYPE", order: 4, status: "FUTURE" },
  { id: "tax-skincare-sun", parentId: "tax-skincare", slug: "sun-protection", nameAr: "الحماية من الشمس", nameEn: "Sun Protection", type: "SUBCATEGORY", order: 4, status: "ACTIVE", icon: "sun", descriptionAr: "واقيات الشمس للوجه والجسم", descriptionEn: "Sunscreens for face and body" },
  { id: "tax-skincare-sun-face", parentId: "tax-skincare-sun", slug: "sunscreen", nameAr: "واقي الشمس للوجه", nameEn: "Face Sunscreen", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE", legacySlugs: ["sunscreen"] },
  { id: "tax-skincare-sun-body", parentId: "tax-skincare-sun", slug: "sunscreen-body", nameAr: "واقي الشمس للجسم", nameEn: "Body Sunscreen", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },

  /* ───────────────────────── 02. العناية بالجسم ───────────────────────── */
  { id: "tax-bodycare", parentId: null, slug: "bodycare", nameAr: "العناية بالجسم", nameEn: "Bodycare", type: "CATEGORY", order: 2, status: "ACTIVE", icon: "shower", descriptionAr: "منتجات فاخرة للعناية بالجسم", descriptionEn: "Luxurious body care products" },
  { id: "tax-bodycare-cleansing", parentId: "tax-bodycare", slug: "body-cleansing", nameAr: "تنظيف الجسم", nameEn: "Body Cleansing", type: "SUBCATEGORY", order: 1, status: "ACTIVE", icon: "shower" },
  { id: "tax-bodycare-cleansing-wash", parentId: "tax-bodycare-cleansing", slug: "body-wash", nameAr: "غسول الجسم", nameEn: "Body Wash", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE", legacySlugs: ["body-wash"] },
  { id: "tax-bodycare-cleansing-soap", parentId: "tax-bodycare-cleansing", slug: "body-soap", nameAr: "صابون الجسم", nameEn: "Body Soap", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-bodycare-cleansing-bath", parentId: "tax-bodycare-cleansing", slug: "bath-products", nameAr: "منتجات الاستحمام", nameEn: "Bath Products", type: "PRODUCT_TYPE", order: 3, status: "FUTURE" },
  { id: "tax-bodycare-moisturizing", parentId: "tax-bodycare", slug: "body-moisturizing", nameAr: "ترطيب الجسم", nameEn: "Body Moisturizing", type: "SUBCATEGORY", order: 2, status: "ACTIVE", icon: "bottle" },
  { id: "tax-bodycare-moist-lotion", parentId: "tax-bodycare-moisturizing", slug: "body-lotion", nameAr: "لوشن الجسم", nameEn: "Body Lotion", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE", legacySlugs: ["body-lotion"] },
  { id: "tax-bodycare-moist-cream", parentId: "tax-bodycare-moisturizing", slug: "body-cream", nameAr: "كريم الجسم", nameEn: "Body Cream", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-bodycare-moist-butter", parentId: "tax-bodycare-moisturizing", slug: "body-butter", nameAr: "زبدة الجسم", nameEn: "Body Butter", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-bodycare-moist-oils", parentId: "tax-bodycare-moisturizing", slug: "body-oils", nameAr: "زيوت الجسم", nameEn: "Body Oils", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE", legacySlugs: ["body-oils"] },
  { id: "tax-bodycare-exfoliating", parentId: "tax-bodycare", slug: "body-exfoliating", nameAr: "تقشير الجسم", nameEn: "Body Exfoliating", type: "SUBCATEGORY", order: 3, status: "ACTIVE", icon: "scrub" },
  { id: "tax-bodycare-exfol-scrubs", parentId: "tax-bodycare-exfoliating", slug: "body-scrubs", nameAr: "مقشرات الجسم", nameEn: "Body Scrubs", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE", legacySlugs: ["body-scrubs"] },
  { id: "tax-bodycare-exfol-tools", parentId: "tax-bodycare-exfoliating", slug: "body-exfoliation-tools", nameAr: "أدوات التقشير", nameEn: "Exfoliation Tools", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-bodycare-hands-feet", parentId: "tax-bodycare", slug: "hands-feet", nameAr: "العناية باليدين والقدمين", nameEn: "Hands & Feet Care", type: "SUBCATEGORY", order: 4, status: "ACTIVE", icon: "hand" },
  { id: "tax-bodycare-hf-hand", parentId: "tax-bodycare-hands-feet", slug: "hand-creams", nameAr: "كريمات اليدين", nameEn: "Hand Creams", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE", legacySlugs: ["hand-care"] },
  { id: "tax-bodycare-hf-foot", parentId: "tax-bodycare-hands-feet", slug: "foot-creams", nameAr: "كريمات القدمين", nameEn: "Foot Creams", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE", legacySlugs: ["foot-care"] },
  { id: "tax-bodycare-hf-treatments", parentId: "tax-bodycare-hands-feet", slug: "hand-foot-treatments", nameAr: "علاجات اليدين والقدمين", nameEn: "Hand & Foot Treatments", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-bodycare-hf-nails", parentId: "tax-bodycare-hands-feet", slug: "hand-foot-nails", nameAr: "العناية بأظافر اليدين والقدمين", nameEn: "Hand & Foot Nail Care", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE" },
  { id: "tax-bodycare-intimate", parentId: "tax-bodycare", slug: "intimate-care", nameAr: "العناية بالمناطق الحساسة", nameEn: "Intimate Care", type: "SUBCATEGORY", order: 5, status: "ACTIVE", icon: "heart" },
  { id: "tax-bodycare-intimate-skin", parentId: "tax-bodycare-intimate", slug: "intimate-skin-care", nameAr: "منتجات العناية الجلدية الخارجية", nameEn: "External Intimate Skin Care", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE", legacySlugs: ["women-care"] },

  /* ───────────────────────── 03. العناية بالشعر ───────────────────────── */
  { id: "tax-haircare", parentId: null, slug: "haircare", nameAr: "العناية بالشعر", nameEn: "Haircare", type: "CATEGORY", order: 3, status: "ACTIVE", icon: "flower", descriptionAr: "أساسيات العناية بالشعر المغذية", descriptionEn: "Nourishing hair care essentials" },
  { id: "tax-haircare-cleansing", parentId: "tax-haircare", slug: "hair-cleansing", nameAr: "تنظيف الشعر", nameEn: "Hair Cleansing", type: "SUBCATEGORY", order: 1, status: "ACTIVE" },
  { id: "tax-haircare-cleansing-shampoo", parentId: "tax-haircare-cleansing", slug: "shampoo", nameAr: "الشامبو", nameEn: "Shampoo", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE", legacySlugs: ["shampoo", "haircare"] },
  { id: "tax-haircare-cleansing-scalp", parentId: "tax-haircare-cleansing", slug: "scalp-cleansers", nameAr: "منتجات تنظيف فروة الرأس", nameEn: "Scalp Cleansers", type: "PRODUCT_TYPE", order: 2, status: "FUTURE" },
  { id: "tax-haircare-moisturizing", parentId: "tax-haircare", slug: "hair-moisturizing", nameAr: "ترطيب الشعر", nameEn: "Hair Moisturizing", type: "SUBCATEGORY", order: 2, status: "ACTIVE" },
  { id: "tax-haircare-moist-conditioner", parentId: "tax-haircare-moisturizing", slug: "conditioner", nameAr: "البلسم", nameEn: "Conditioner", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE", legacySlugs: ["conditioner"] },
  { id: "tax-haircare-moist-creams", parentId: "tax-haircare-moisturizing", slug: "hair-creams", nameAr: "كريمات الشعر", nameEn: "Hair Creams", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE", legacySlugs: ["hair-creams"] },
  { id: "tax-haircare-moist-masks", parentId: "tax-haircare-moisturizing", slug: "hair-masks", nameAr: "ماسكات الشعر", nameEn: "Hair Masks", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE", legacySlugs: ["hair-masks"] },
  { id: "tax-haircare-treatments", parentId: "tax-haircare", slug: "hair-treatments", nameAr: "علاجات الشعر", nameEn: "Hair Treatments", type: "SUBCATEGORY", order: 3, status: "ACTIVE", legacySlugs: ["hair-treatments"] },
  { id: "tax-haircare-treat-loss", parentId: "tax-haircare-treatments", slug: "hair-loss-treatments", nameAr: "علاجات التساقط", nameEn: "Hair Loss Treatments", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-haircare-treat-damage", parentId: "tax-haircare-treatments", slug: "damage-treatments", nameAr: "علاجات التلف", nameEn: "Damage Treatments", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-haircare-treat-scalp", parentId: "tax-haircare-treatments", slug: "scalp-treatments", nameAr: "علاجات فروة الرأس", nameEn: "Scalp Treatments", type: "PRODUCT_TYPE", order: 3, status: "FUTURE" },
  { id: "tax-haircare-treat-ends", parentId: "tax-haircare-treatments", slug: "split-end-treatments", nameAr: "علاجات الأطراف", nameEn: "Split-End Treatments", type: "PRODUCT_TYPE", order: 4, status: "FUTURE" },
  { id: "tax-haircare-treat-dyes", parentId: "tax-haircare-treatments", slug: "hair-dyes", nameAr: "صبغات الشعر", nameEn: "Hair Dyes", type: "PRODUCT_TYPE", order: 5, status: "ACTIVE", legacySlugs: ["hair-dyes"] },
  { id: "tax-haircare-oils-serums", parentId: "tax-haircare", slug: "hair-oils-serums", nameAr: "الزيوت والسيرومات", nameEn: "Hair Oils & Serums", type: "SUBCATEGORY", order: 4, status: "ACTIVE" },
  { id: "tax-haircare-oils-oils", parentId: "tax-haircare-oils-serums", slug: "hair-oils", nameAr: "زيوت الشعر", nameEn: "Hair Oils", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE", legacySlugs: ["hair-oils"] },
  { id: "tax-haircare-oils-serums-pt", parentId: "tax-haircare-oils-serums", slug: "hair-serums", nameAr: "سيرومات الشعر", nameEn: "Hair Serums", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-haircare-styling", parentId: "tax-haircare", slug: "hair-styling", nameAr: "التصفيف", nameEn: "Hair Styling", type: "SUBCATEGORY", order: 5, status: "ACTIVE", legacySlugs: ["hair-styling"] },
  { id: "tax-haircare-styling-creams", parentId: "tax-haircare-styling", slug: "styling-creams", nameAr: "كريمات التصفيف", nameEn: "Styling Creams", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-haircare-styling-gel", parentId: "tax-haircare-styling", slug: "hair-gel", nameAr: "جل الشعر", nameEn: "Hair Gel", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-haircare-styling-spray", parentId: "tax-haircare-styling", slug: "hair-spray", nameAr: "سبراي الشعر", nameEn: "Hair Spray", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-haircare-styling-hold", parentId: "tax-haircare-styling", slug: "hair-hold-products", nameAr: "منتجات التثبيت", nameEn: "Hold Products", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE" },

  /* ───────────────────────── 04. المكياج ───────────────────────── */
  { id: "tax-makeup", parentId: null, slug: "makeup", nameAr: "المكياج", nameEn: "Makeup", type: "CATEGORY", order: 4, status: "ACTIVE", icon: "palette", descriptionAr: "مكياج مذهل لكل المناسبات", descriptionEn: "Stunning makeup for every occasion" },
  { id: "tax-makeup-face", parentId: "tax-makeup", slug: "face-makeup", nameAr: "مكياج الوجه", nameEn: "Face Makeup", type: "SUBCATEGORY", order: 1, status: "ACTIVE", legacySlugs: ["face-makeup", "makeup"] },
  { id: "tax-makeup-face-foundation", parentId: "tax-makeup-face", slug: "foundation", nameAr: "كريم الأساس", nameEn: "Foundation", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-makeup-face-concealer", parentId: "tax-makeup-face", slug: "concealer", nameAr: "الكونسيلر", nameEn: "Concealer", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-makeup-face-powder", parentId: "tax-makeup-face", slug: "powder", nameAr: "البودرة", nameEn: "Powder", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-makeup-face-blush", parentId: "tax-makeup-face", slug: "blush", nameAr: "البلاشر", nameEn: "Blush", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE" },
  { id: "tax-makeup-face-bronzer", parentId: "tax-makeup-face", slug: "bronzer", nameAr: "البرونزر", nameEn: "Bronzer", type: "PRODUCT_TYPE", order: 5, status: "ACTIVE" },
  { id: "tax-makeup-face-highlighter", parentId: "tax-makeup-face", slug: "highlighter", nameAr: "الهايلايتر", nameEn: "Highlighter", type: "PRODUCT_TYPE", order: 6, status: "ACTIVE" },
  { id: "tax-makeup-face-primer", parentId: "tax-makeup-face", slug: "primer", nameAr: "البرايمر", nameEn: "Primer", type: "PRODUCT_TYPE", order: 7, status: "ACTIVE" },
  { id: "tax-makeup-face-setting-spray", parentId: "tax-makeup-face", slug: "setting-spray", nameAr: "مثبتات المكياج", nameEn: "Setting Sprays", type: "PRODUCT_TYPE", order: 8, status: "ACTIVE" },
  { id: "tax-makeup-face-bb-cream", parentId: "tax-makeup-face", slug: "bb-cream", nameAr: "بي بي كريم", nameEn: "BB Cream", type: "PRODUCT_TYPE", order: 9, status: "ACTIVE" },
  { id: "tax-makeup-face-contour", parentId: "tax-makeup-face", slug: "contour", nameAr: "الكونتور", nameEn: "Contour", type: "PRODUCT_TYPE", order: 10, status: "ACTIVE" },
  { id: "tax-makeup-eyes", parentId: "tax-makeup", slug: "eye-makeup", nameAr: "مكياج العيون", nameEn: "Eye Makeup", type: "SUBCATEGORY", order: 2, status: "ACTIVE", legacySlugs: ["eye-makeup"] },
  { id: "tax-makeup-eyes-mascara", parentId: "tax-makeup-eyes", slug: "mascara", nameAr: "الماسكارا", nameEn: "Mascara", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-makeup-eyes-eyeliner", parentId: "tax-makeup-eyes", slug: "eyeliner", nameAr: "الآيلاينر", nameEn: "Eyeliner", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-makeup-eyes-kohl", parentId: "tax-makeup-eyes", slug: "kohl", nameAr: "الكحل", nameEn: "Kohl", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-makeup-eyes-eyeshadow", parentId: "tax-makeup-eyes", slug: "eyeshadow", nameAr: "ظلال العيون", nameEn: "Eyeshadow", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE" },
  { id: "tax-makeup-eyes-brows", parentId: "tax-makeup-eyes", slug: "brow-products", nameAr: "منتجات الحواجب", nameEn: "Brow Products", type: "PRODUCT_TYPE", order: 5, status: "ACTIVE" },
  { id: "tax-makeup-lips", parentId: "tax-makeup", slug: "lip-makeup", nameAr: "مكياج الشفاه", nameEn: "Lip Makeup", type: "SUBCATEGORY", order: 3, status: "ACTIVE", legacySlugs: ["lip-makeup"] },
  { id: "tax-makeup-lips-lipstick", parentId: "tax-makeup-lips", slug: "lipstick", nameAr: "أحمر الشفاه", nameEn: "Lipstick", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-makeup-lips-gloss", parentId: "tax-makeup-lips", slug: "lip-gloss", nameAr: "ملمع الشفاه", nameEn: "Lip Gloss", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-makeup-lips-liner", parentId: "tax-makeup-lips", slug: "lip-liner", nameAr: "محدد الشفاه", nameEn: "Lip Liner", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-makeup-removers", parentId: "tax-makeup", slug: "makeup-removers", nameAr: "مزيلات المكياج", nameEn: "Makeup Removers", type: "SUBCATEGORY", order: 4, status: "ACTIVE", icon: "droplets" },
  { id: "tax-makeup-nails", parentId: "tax-makeup", slug: "nail-makeup", nameAr: "مكياج الاظافر", nameEn: "Nail Makeup", type: "SUBCATEGORY", order: 5, status: "ACTIVE", icon: "hand", legacySlugs: ["nail-care"], descriptionAr: "منتجات مكياج الأظافر والطلاء", descriptionEn: "Nail makeup and polish products" },
  { id: "tax-makeup-nails-polish", parentId: "tax-makeup-nails", slug: "nail-polish", nameAr: "طلاء الأظافر", nameEn: "Nail Polish", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-makeup-nails-care", parentId: "tax-makeup-nails", slug: "nail-care-products", nameAr: "منتجات العناية بالأظافر", nameEn: "Nail Care Products", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-makeup-nails-tools", parentId: "tax-makeup-nails", slug: "nail-tools", nameAr: "أدوات الأظافر", nameEn: "Nail Tools", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-makeup-nail-treatments", parentId: "tax-makeup-nails", slug: "nail-treatments", nameAr: "علاجات الأظافر", nameEn: "Nail Treatments", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE" },
  { id: "tax-makeup-nail-remover", parentId: "tax-makeup-nails", slug: "nail-remover", nameAr: "منظف الأظافر", nameEn: "Nail Polish Remover", type: "PRODUCT_TYPE", order: 5, status: "ACTIVE" },

  /* ───────────────────── 05. العطور والروائح الشخصية ───────────────────── */
  { id: "tax-perfume", parentId: null, slug: "perfume", nameAr: "العطور والروائح الشخصية", nameEn: "Fragrances", type: "CATEGORY", order: 5, status: "ACTIVE", icon: "flask", descriptionAr: "عطور فاخرة للنساء والرجال", descriptionEn: "Luxury fragrances for men and women" },
  { id: "tax-perfume-women", parentId: "tax-perfume", slug: "women-perfumes", nameAr: "عطور نسائية", nameEn: "Women's Perfumes", type: "SUBCATEGORY", order: 1, status: "ACTIVE", legacySlugs: ["perfume-women"] },
  { id: "tax-perfume-women-perfume", parentId: "tax-perfume-women", slug: "women-perfume", nameAr: "عطور نسائية", nameEn: "Women's Perfume", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-perfume-women-arabic", parentId: "tax-perfume-women", slug: "arabic-women-perfume", nameAr: "عطور عربية نسائية", nameEn: "Arabic Women's Perfume", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-perfume-women-french", parentId: "tax-perfume-women", slug: "french-women-perfume", nameAr: "عطور فرنسية نسائية", nameEn: "French Women's Perfume", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-perfume-women-oil", parentId: "tax-perfume-women", slug: "oil-women-perfume", nameAr: "عطور زيتية نسائية", nameEn: "Oil Women's Perfume", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE" },
  { id: "tax-perfume-women-mist", parentId: "tax-perfume-women", slug: "women-body-mist", nameAr: "بودي ميست نسائي", nameEn: "Women's Body Mist", type: "PRODUCT_TYPE", order: 5, status: "ACTIVE" },
  { id: "tax-perfume-women-musk", parentId: "tax-perfume-women", slug: "women-musk", nameAr: "مسك نسائي", nameEn: "Women's Musk", type: "PRODUCT_TYPE", order: 6, status: "ACTIVE", legacySlugs: ["perfume-musk", "perfume"] },
  { id: "tax-perfume-men", parentId: "tax-perfume", slug: "men-perfumes", nameAr: "عطور رجالية", nameEn: "Men's Perfumes", type: "SUBCATEGORY", order: 2, status: "ACTIVE", legacySlugs: ["perfume-men"] },
  { id: "tax-perfume-men-perfume", parentId: "tax-perfume-men", slug: "men-perfume", nameAr: "عطور رجالية", nameEn: "Men's Perfume", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-perfume-men-arabic", parentId: "tax-perfume-men", slug: "arabic-men-perfume", nameAr: "عطور عربية رجالية", nameEn: "Arabic Men's Perfume", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-perfume-men-french", parentId: "tax-perfume-men", slug: "french-men-perfume", nameAr: "عطور فرنسية رجالية", nameEn: "French Men's Perfume", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-perfume-men-oil", parentId: "tax-perfume-men", slug: "oil-men-perfume", nameAr: "عطور زيتية رجالية", nameEn: "Oil Men's Perfume", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE" },
  { id: "tax-perfume-men-mist", parentId: "tax-perfume-men", slug: "men-body-mist", nameAr: "بودي ميست رجالي", nameEn: "Men's Body Mist", type: "PRODUCT_TYPE", order: 5, status: "ACTIVE" },
  { id: "tax-perfume-men-musk", parentId: "tax-perfume-men", slug: "men-musk", nameAr: "مسك رجالي", nameEn: "Men's Musk", type: "PRODUCT_TYPE", order: 6, status: "ACTIVE" },
  { id: "tax-perfume-unisex", parentId: "tax-perfume", slug: "unisex-perfumes", nameAr: "عطور للجنسين", nameEn: "Unisex Perfumes", type: "SUBCATEGORY", order: 3, status: "ACTIVE" },
  { id: "tax-perfume-unisex-perfume", parentId: "tax-perfume-unisex", slug: "unisex-perfume", nameAr: "عطور للجنسين", nameEn: "Unisex Perfume", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-perfume-unisex-arabic", parentId: "tax-perfume-unisex", slug: "arabic-unisex-perfume", nameAr: "عطور عربية للجنسين", nameEn: "Arabic Unisex Perfume", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-perfume-unisex-oil", parentId: "tax-perfume-unisex", slug: "oil-unisex-perfume", nameAr: "عطور زيتية للجنسين", nameEn: "Oil Unisex Perfume", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-perfume-mists", parentId: "tax-perfume", slug: "body-mists", nameAr: "معطرات الجسم", nameEn: "Body Mists", type: "SUBCATEGORY", order: 4, status: "ACTIVE", icon: "spray" },

  /* ───────────────────────── 06. العناية بالفم ───────────────────────── */
  { id: "tax-oral-care", parentId: null, slug: "oral-care", nameAr: "العناية بالفم", nameEn: "Oral Care", type: "CATEGORY", order: 6, status: "ACTIVE", icon: "tooth", descriptionAr: "منتجات العناية بالأسنان والفم", descriptionEn: "Teeth and mouth care products" },
  { id: "tax-oral-cleansing", parentId: "tax-oral-care", slug: "teeth-cleansing", nameAr: "تنظيف الأسنان", nameEn: "Teeth Cleansing", type: "SUBCATEGORY", order: 1, status: "ACTIVE" },
  { id: "tax-oral-cleansing-toothpaste", parentId: "tax-oral-cleansing", slug: "toothpaste", nameAr: "معجون الأسنان", nameEn: "Toothpaste", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-oral-cleansing-brushes", parentId: "tax-oral-cleansing", slug: "toothbrushes", nameAr: "فرش الأسنان", nameEn: "Toothbrushes", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE", legacySlugs: ["appliances-teeth"] },
  { id: "tax-oral-interdental", parentId: "tax-oral-care", slug: "interdental-care", nameAr: "العناية بين الأسنان", nameEn: "Interdental Care", type: "SUBCATEGORY", order: 2, status: "FUTURE" },
  { id: "tax-oral-interdental-floss", parentId: "tax-oral-interdental", slug: "dental-floss", nameAr: "خيط الأسنان", nameEn: "Dental Floss", type: "PRODUCT_TYPE", order: 1, status: "FUTURE" },
  { id: "tax-oral-interdental-brushes", parentId: "tax-oral-interdental", slug: "interdental-brushes", nameAr: "فرش ما بين الأسنان", nameEn: "Interdental Brushes", type: "PRODUCT_TYPE", order: 2, status: "FUTURE" },
  { id: "tax-oral-interdental-tools", parentId: "tax-oral-interdental", slug: "interdental-tools", nameAr: "أدوات التنظيف بين الأسنان", nameEn: "Interdental Tools", type: "PRODUCT_TYPE", order: 3, status: "FUTURE" },
  { id: "tax-oral-mouthwash", parentId: "tax-oral-care", slug: "mouthwash", nameAr: "غسول الفم", nameEn: "Mouthwash", type: "SUBCATEGORY", order: 3, status: "ACTIVE" },
  { id: "tax-oral-whitening", parentId: "tax-oral-care", slug: "teeth-whitening", nameAr: "تبييض الأسنان", nameEn: "Teeth Whitening", type: "SUBCATEGORY", order: 4, status: "ACTIVE" },
  { id: "tax-oral-whitening-products", parentId: "tax-oral-whitening", slug: "whitening-products", nameAr: "منتجات التبييض", nameEn: "Whitening Products", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-oral-whitening-tools", parentId: "tax-oral-whitening", slug: "whitening-tools", nameAr: "أدوات التبييض", nameEn: "Whitening Tools", type: "PRODUCT_TYPE", order: 2, status: "FUTURE" },

  /* ───────────────────────── 07. العناية الشخصية ───────────────────────── */
  { id: "tax-personal-care", parentId: null, slug: "personal-care", nameAr: "العناية الشخصية", nameEn: "Personal Care", type: "CATEGORY", order: 7, status: "ACTIVE", icon: "sparkles", descriptionAr: "النظافة اليومية والعناية الشخصية", descriptionEn: "Daily hygiene and personal care" },
  { id: "tax-pc-hygiene", parentId: "tax-personal-care", slug: "daily-hygiene", nameAr: "النظافة اليومية", nameEn: "Daily Hygiene", type: "SUBCATEGORY", order: 1, status: "ACTIVE" },
  { id: "tax-pc-hygiene-products", parentId: "tax-pc-hygiene", slug: "daily-hygiene-products", nameAr: "منتجات النظافة اليومية", nameEn: "Daily Hygiene Products", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-pc-hygiene-wipes", parentId: "tax-pc-hygiene", slug: "personal-wipes", nameAr: "مناديل العناية الشخصية", nameEn: "Personal Care Wipes", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-pc-hygiene-general", parentId: "tax-pc-hygiene", slug: "general-hygiene", nameAr: "منتجات النظافة العامة", nameEn: "General Hygiene", type: "PRODUCT_TYPE", order: 3, status: "FUTURE" },
  { id: "tax-pc-deodorants", parentId: "tax-personal-care", slug: "deodorants", nameAr: "مزيلات العرق والروائح الشخصية", nameEn: "Deodorants", type: "SUBCATEGORY", order: 2, status: "ACTIVE", legacySlugs: ["deodorants"] },
  { id: "tax-pc-deodorants-pt", parentId: "tax-pc-deodorants", slug: "deodorants-pt", nameAr: "مزيلات العرق", nameEn: "Deodorants", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-pc-deodorants-antiperspirant", parentId: "tax-pc-deodorants", slug: "antiperspirants", nameAr: "مضادات التعرق", nameEn: "Antiperspirants", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-pc-deodorants-odor", parentId: "tax-pc-deodorants", slug: "odor-control", nameAr: "منتجات التحكم بالرائحة", nameEn: "Odor Control", type: "PRODUCT_TYPE", order: 3, status: "FUTURE" },
  { id: "tax-pc-shaving", parentId: "tax-personal-care", slug: "shaving-hair-removal", nameAr: "الحلاقة وإزالة الشعر", nameEn: "Shaving & Hair Removal", type: "SUBCATEGORY", order: 3, status: "ACTIVE", legacySlugs: ["appliances-shaving"] },
  { id: "tax-pc-shaving-products", parentId: "tax-pc-shaving", slug: "shaving-products", nameAr: "منتجات الحلاقة", nameEn: "Shaving Products", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-pc-shaving-creams", parentId: "tax-pc-shaving", slug: "shaving-creams", nameAr: "كريمات الحلاقة", nameEn: "Shaving Creams", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-pc-shaving-after", parentId: "tax-pc-shaving", slug: "after-shave", nameAr: "منتجات ما بعد الحلاقة", nameEn: "After-Shave", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-pc-shaving-removal", parentId: "tax-pc-shaving", slug: "hair-removal", nameAr: "إزالة الشعر", nameEn: "Hair Removal", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE" },
  { id: "tax-pc-feminine", parentId: "tax-personal-care", slug: "feminine-care", nameAr: "العناية النسائية", nameEn: "Feminine Care", type: "SUBCATEGORY", order: 4, status: "ACTIVE", icon: "heart" },
  { id: "tax-pc-feminine-pads", parentId: "tax-pc-feminine", slug: "sanitary-pads", nameAr: "الفوط الصحية", nameEn: "Sanitary Pads", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-pc-feminine-supplies", parentId: "tax-pc-feminine", slug: "feminine-care-supplies", nameAr: "مستلزمات العناية النسائية", nameEn: "Feminine Care Supplies", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },

  /* ───────────────────── 08. العدسات والعناية بالعين ───────────────────── */
  { id: "tax-contact-lenses", parentId: null, slug: "contact-lenses", nameAr: "العدسات والعناية بالعين", nameEn: "Contact Lenses & Eye Care", type: "CATEGORY", order: 8, status: "ACTIVE", icon: "eye", descriptionAr: "العدسات اللاصقة ومحاليلها ومستلزماتها", descriptionEn: "Contact lenses, solutions and accessories" },
  { id: "tax-cl-lenses", parentId: "tax-contact-lenses", slug: "lenses", nameAr: "العدسات اللاصقة", nameEn: "Contact Lenses", type: "SUBCATEGORY", order: 1, status: "ACTIVE", legacySlugs: ["contact-lenses"] },
  { id: "tax-cl-lenses-cosmetic", parentId: "tax-cl-lenses", slug: "cosmetic-lenses", nameAr: "عدسات تجميلية", nameEn: "Cosmetic Lenses", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-cl-lenses-colored", parentId: "tax-cl-lenses", slug: "colored-lenses", nameAr: "عدسات ملونة", nameEn: "Colored Lenses", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-cl-lenses-other", parentId: "tax-cl-lenses", slug: "other-lenses", nameAr: "عدسات أخرى", nameEn: "Other Lenses", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-cl-solutions", parentId: "tax-contact-lenses", slug: "lens-solutions", nameAr: "محاليل العدسات", nameEn: "Lens Solutions", type: "SUBCATEGORY", order: 2, status: "ACTIVE" },
  { id: "tax-cl-cleaning", parentId: "tax-contact-lenses", slug: "lens-cleaning", nameAr: "تنظيف وحفظ العدسات", nameEn: "Lens Cleaning & Storage", type: "SUBCATEGORY", order: 3, status: "ACTIVE" },
  { id: "tax-cl-accessories", parentId: "tax-contact-lenses", slug: "lens-accessories", nameAr: "مستلزمات العدسات", nameEn: "Lens Accessories", type: "SUBCATEGORY", order: 4, status: "FUTURE" },

  /* ───────────────────────── 09. الأم والطفل ───────────────────────── */
  { id: "tax-mother-baby", parentId: null, slug: "mother-baby", nameAr: "الأم والطفل", nameEn: "Mother & Baby", type: "CATEGORY", order: 9, status: "ACTIVE", icon: "baby", descriptionAr: "عناية لطيفة للأم والطفل", descriptionEn: "Gentle care for mother and baby" },
  { id: "tax-mb-baby", parentId: "tax-mother-baby", slug: "baby-care", nameAr: "العناية بالطفل", nameEn: "Baby Care", type: "SUBCATEGORY", order: 1, status: "ACTIVE", legacySlugs: ["baby-care"] },
  { id: "tax-mb-baby-bathing", parentId: "tax-mb-baby", slug: "baby-bathing", nameAr: "استحمام الطفل", nameEn: "Baby Bathing", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-mb-baby-moist", parentId: "tax-mb-baby", slug: "baby-moisturizing", nameAr: "ترطيب الطفل", nameEn: "Baby Moisturizing", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-mb-baby-hair", parentId: "tax-mb-baby", slug: "baby-hair-care", nameAr: "العناية بشعر الطفل", nameEn: "Baby Hair Care", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-mb-baby-daily", parentId: "tax-mb-baby", slug: "baby-daily-care", nameAr: "العناية اليومية للطفل", nameEn: "Baby Daily Care", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE" },
  { id: "tax-mb-mother", parentId: "tax-mother-baby", slug: "mother-care", nameAr: "العناية بالأم", nameEn: "Mother Care", type: "SUBCATEGORY", order: 2, status: "ACTIVE" },

  /* ───────────────────────── 10. الصحة والعافية ───────────────────────── */
  { id: "tax-health-wellness", parentId: null, slug: "health-wellness", nameAr: "الصحة والعافية", nameEn: "Health & Wellness", type: "CATEGORY", order: 10, status: "ACTIVE", icon: "pill", descriptionAr: "فيتامينات ومكملات غذائية", descriptionEn: "Vitamins and dietary supplements" },
  { id: "tax-hw-vitsupp", parentId: "tax-health-wellness", slug: "vitamins-supplements", nameAr: "الفيتامينات والمكملات", nameEn: "Vitamins & Supplements", type: "SUBCATEGORY", order: 1, status: "ACTIVE", legacySlugs: ["vitamins"] },
  { id: "tax-hw-vitamins-pt", parentId: "tax-hw-vitsupp", slug: "vitamins-pt", nameAr: "الفيتامينات", nameEn: "Vitamins", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-hw-vitamins-collagen", parentId: "tax-hw-vitsupp", slug: "collagen", nameAr: "الكولاجين", nameEn: "Collagen", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE", legacySlugs: ["collagen"] },
  { id: "tax-hw-vitamins-immunity", parentId: "tax-hw-vitsupp", slug: "immunity", nameAr: "المناعة", nameEn: "Immunity", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE", legacySlugs: ["immunity"] },
  { id: "tax-hw-vitamins-hair-nails", parentId: "tax-hw-vitsupp", slug: "hair-nails", nameAr: "الشعر والأظافر", nameEn: "Hair & Nails", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE", legacySlugs: ["hair-nails"] },
  { id: "tax-hw-vitamins-minerals", parentId: "tax-hw-vitsupp", slug: "minerals", nameAr: "المعادن", nameEn: "Minerals", type: "PRODUCT_TYPE", order: 5, status: "ACTIVE" },
  { id: "tax-hw-supplements", parentId: "tax-health-wellness", slug: "supplements", nameAr: "المكملات الغذائية", nameEn: "Dietary Supplements", type: "SUBCATEGORY", order: 2, status: "ACTIVE", legacySlugs: ["supplements"] },
  { id: "tax-hw-supplements-pt", parentId: "tax-hw-supplements", slug: "supplements-pt", nameAr: "المكملات الغذائية", nameEn: "Dietary Supplements", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-hw-supplements-kids", parentId: "tax-hw-supplements", slug: "kids-supplements", nameAr: "مكملات الأطفال", nameEn: "Kids Supplements", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE", legacySlugs: ["kids-supplements"] },
  { id: "tax-hw-supplements-women", parentId: "tax-hw-supplements", slug: "women-health", nameAr: "صحة المرأة", nameEn: "Women's Health", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE", legacySlugs: ["women-health"] },
  { id: "tax-hw-future", parentId: "tax-health-wellness", slug: "future-health-categories", nameAr: "فئات الصحة والعافية المستقبلية", nameEn: "Future Health Categories", type: "SUBCATEGORY", order: 3, status: "FUTURE" },

  /* ───────────────────────── 11. الأجهزة والأدوات ───────────────────────── */
  { id: "tax-appliances-tools", parentId: null, slug: "appliances-tools", nameAr: "الأجهزة والأدوات", nameEn: "Appliances & Tools", type: "CATEGORY", order: 11, status: "ACTIVE", icon: "wrench", descriptionAr: "أجهزة وأدوات العناية الشخصية", descriptionEn: "Personal care appliances and tools" },
  { id: "tax-at-skincare-devices", parentId: "tax-appliances-tools", slug: "skincare-devices", nameAr: "أجهزة العناية بالبشرة", nameEn: "Skincare Devices", type: "SUBCATEGORY", order: 1, status: "ACTIVE" },
  { id: "tax-at-skdev-cleansing", parentId: "tax-at-skincare-devices", slug: "cleansing-devices", nameAr: "أجهزة تنظيف البشرة", nameEn: "Cleansing Devices", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-at-skdev-face", parentId: "tax-at-skincare-devices", slug: "face-devices", nameAr: "أجهزة العناية بالوجه", nameEn: "Face Devices", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-at-skdev-other", parentId: "tax-at-skincare-devices", slug: "other-skincare-devices", nameAr: "أجهزة العناية بالبشرة الأخرى", nameEn: "Other Skincare Devices", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-at-hair-devices", parentId: "tax-appliances-tools", slug: "hair-devices", nameAr: "أجهزة الشعر", nameEn: "Hair Devices", type: "SUBCATEGORY", order: 2, status: "ACTIVE", legacySlugs: ["appliances-hair"] },
  { id: "tax-at-hairdev-dryers", parentId: "tax-at-hair-devices", slug: "hair-dryers", nameAr: "مجففات الشعر", nameEn: "Hair Dryers", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-at-hairdev-straighteners", parentId: "tax-at-hair-devices", slug: "hair-straighteners", nameAr: "مكواة الشعر", nameEn: "Hair Straighteners", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-at-hairdev-stylers", parentId: "tax-at-hair-devices", slug: "styling-devices", nameAr: "أجهزة التصفيف", nameEn: "Styling Devices", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-at-hairdev-other", parentId: "tax-at-hair-devices", slug: "other-hair-devices", nameAr: "أجهزة الشعر الأخرى", nameEn: "Other Hair Devices", type: "PRODUCT_TYPE", order: 4, status: "ACTIVE" },
  { id: "tax-at-makeup-tools", parentId: "tax-appliances-tools", slug: "makeup-tools", nameAr: "أدوات المكياج", nameEn: "Makeup Tools", type: "SUBCATEGORY", order: 3, status: "ACTIVE", legacySlugs: ["makeup-tools"] },
  { id: "tax-at-mkup-brushes", parentId: "tax-at-makeup-tools", slug: "makeup-brushes", nameAr: "فرش المكياج", nameEn: "Makeup Brushes", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-at-mkup-sponges", parentId: "tax-at-makeup-tools", slug: "makeup-sponges", nameAr: "إسفنجات المكياج", nameEn: "Makeup Sponges", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-at-mkup-applicators", parentId: "tax-at-makeup-tools", slug: "makeup-applicators", nameAr: "أدوات تطبيق المكياج", nameEn: "Makeup Applicators", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE" },
  { id: "tax-at-personal-tools", parentId: "tax-appliances-tools", slug: "personal-care-tools", nameAr: "أدوات العناية الشخصية", nameEn: "Personal Care Tools", type: "SUBCATEGORY", order: 4, status: "ACTIVE" },
  { id: "tax-at-pers-shaving", parentId: "tax-at-personal-tools", slug: "shaving-tools", nameAr: "أدوات الحلاقة", nameEn: "Shaving Tools", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-at-pers-care", parentId: "tax-at-personal-tools", slug: "care-tools", nameAr: "أدوات العناية", nameEn: "Care Tools", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE", legacySlugs: ["tools", "hair-tools"] },
  { id: "tax-at-pers-beauty", parentId: "tax-at-personal-tools", slug: "beauty-tools", nameAr: "أدوات التجميل", nameEn: "Beauty Tools", type: "PRODUCT_TYPE", order: 3, status: "ACTIVE", legacySlugs: ["beauty-tools"] },
  { id: "tax-at-other", parentId: "tax-appliances-tools", slug: "other-tools", nameAr: "أجهزة وأدوات أخرى", nameEn: "Other Devices & Tools", type: "SUBCATEGORY", order: 5, status: "ACTIVE" },

  /* ───────────────────────── 12. المنزل والروائح ───────────────────────── */
  { id: "tax-home-fragrance", parentId: null, slug: "home-fragrance", nameAr: "المنزل والروائح", nameEn: "Home & Fragrance", type: "CATEGORY", order: 12, status: "ACTIVE", icon: "flame", descriptionAr: "بخور ومعطرات وشموع منزلية", descriptionEn: "Bakhoor, home fragrances and candles" },
  { id: "tax-hf-bakhoor", parentId: "tax-home-fragrance", slug: "bakhoor", nameAr: "البخور", nameEn: "Bakhoor", type: "SUBCATEGORY", order: 1, status: "ACTIVE", legacySlugs: ["bakhoor-premium", "bakhoor-oud"] },
  { id: "tax-hf-bakhoor-premium", parentId: "tax-hf-bakhoor", slug: "bakhoor-premium", nameAr: "بخور فاخر", nameEn: "Premium Bakhoor", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-hf-bakhoor-oud", parentId: "tax-hf-bakhoor", slug: "natural-oud", nameAr: "عود طبيعي", nameEn: "Natural Oud", type: "PRODUCT_TYPE", order: 2, status: "ACTIVE" },
  { id: "tax-hf-bakhoor-dehn", parentId: "tax-hf-bakhoor", slug: "oud-oil", nameAr: "دهن العود", nameEn: "Oud Oil", type: "PRODUCT_TYPE", order: 3, status: "FUTURE", legacySlugs: ["bakhoor-dehn"] },
  { id: "tax-hf-fragrances", parentId: "tax-home-fragrance", slug: "home-fragrances", nameAr: "المعطرات المنزلية", nameEn: "Home Fragrances", type: "SUBCATEGORY", order: 2, status: "ACTIVE" },
  { id: "tax-hf-frag-pt", parentId: "tax-hf-fragrances", slug: "home-fragrance-pt", nameAr: "معطرات منزلية", nameEn: "Home Fragrances", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE", legacySlugs: ["bakhoor-home"] },
  { id: "tax-hf-candles", parentId: "tax-home-fragrance", slug: "candles", nameAr: "الشموع", nameEn: "Candles", type: "SUBCATEGORY", order: 3, status: "FUTURE" },
  { id: "tax-hf-home-perfumes", parentId: "tax-home-fragrance", slug: "home-perfumes", nameAr: "العطور المنزلية", nameEn: "Home Perfumes", type: "SUBCATEGORY", order: 4, status: "ACTIVE" },
  { id: "tax-hf-homeperf-pt", parentId: "tax-hf-home-perfumes", slug: "home-perfumes-pt", nameAr: "عطور منزلية", nameEn: "Home Perfumes", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },
  { id: "tax-hf-accessories", parentId: "tax-home-fragrance", slug: "home-fragrance-accessories", nameAr: "مستلزمات الروائح المنزلية", nameEn: "Home Fragrance Accessories", type: "SUBCATEGORY", order: 5, status: "FUTURE" },

  /* ───────────────────────── 13. الاكسسوارات ───────────────────────── */
  { id: "tax-accessories", parentId: null, slug: "accessories", nameAr: "الاكسسوارات", nameEn: "Accessories", type: "CATEGORY", order: 13, status: "ACTIVE", icon: "gem", descriptionAr: "اكسسوارات التجميل والعناية الشخصية", descriptionEn: "Beauty and personal care accessories" },
  { id: "tax-acc-beauty", parentId: "tax-accessories", slug: "beauty-accessories", nameAr: "اكسسوارات التجميل", nameEn: "Beauty Accessories", type: "SUBCATEGORY", order: 1, status: "ACTIVE" },
  { id: "tax-acc-hair", parentId: "tax-accessories", slug: "hair-accessories", nameAr: "اكسسوارات الشعر", nameEn: "Hair Accessories", type: "SUBCATEGORY", order: 2, status: "ACTIVE" },
  { id: "tax-acc-personal", parentId: "tax-accessories", slug: "personal-accessories", nameAr: "اكسسوارات شخصية", nameEn: "Personal Accessories", type: "SUBCATEGORY", order: 3, status: "ACTIVE" },
  { id: "tax-acc-misc", parentId: "tax-accessories", slug: "misc-accessories", nameAr: "اكسسوارات أخرى", nameEn: "Other Accessories", type: "SUBCATEGORY", order: 4, status: "ACTIVE" },

  /* Bundle under all 13 categories */
  { id: "tax-skincare-bundle", parentId: "tax-skincare", slug: "skincare-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-skincare-bundle-pt", parentId: "tax-skincare-bundle", slug: "skincare-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },

  { id: "tax-bodycare-bundle", parentId: "tax-bodycare", slug: "bodycare-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-bodycare-bundle-pt", parentId: "tax-bodycare-bundle", slug: "bodycare-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },

  { id: "tax-haircare-bundle", parentId: "tax-haircare", slug: "haircare-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-haircare-bundle-pt", parentId: "tax-haircare-bundle", slug: "haircare-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },

  { id: "tax-makeup-bundle", parentId: "tax-makeup", slug: "makeup-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-makeup-bundle-pt", parentId: "tax-makeup-bundle", slug: "makeup-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },

  { id: "tax-perfume-bundle", parentId: "tax-perfume", slug: "perfume-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-perfume-bundle-pt", parentId: "tax-perfume-bundle", slug: "perfume-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },

  { id: "tax-oral-care-bundle", parentId: "tax-oral-care", slug: "oral-care-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-oral-care-bundle-pt", parentId: "tax-oral-care-bundle", slug: "oral-care-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },

  { id: "tax-personal-care-bundle", parentId: "tax-personal-care", slug: "personal-care-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-personal-care-bundle-pt", parentId: "tax-personal-care-bundle", slug: "personal-care-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },

  { id: "tax-contact-lenses-bundle", parentId: "tax-contact-lenses", slug: "contact-lenses-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-contact-lenses-bundle-pt", parentId: "tax-contact-lenses-bundle", slug: "contact-lenses-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },

  { id: "tax-mother-baby-bundle", parentId: "tax-mother-baby", slug: "mother-baby-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-mother-baby-bundle-pt", parentId: "tax-mother-baby-bundle", slug: "mother-baby-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },

  { id: "tax-health-wellness-bundle", parentId: "tax-health-wellness", slug: "health-wellness-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-health-wellness-bundle-pt", parentId: "tax-health-wellness-bundle", slug: "health-wellness-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },

  { id: "tax-appliances-tools-bundle", parentId: "tax-appliances-tools", slug: "appliances-tools-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-appliances-tools-bundle-pt", parentId: "tax-appliances-tools-bundle", slug: "appliances-tools-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },

  { id: "tax-home-fragrance-bundle", parentId: "tax-home-fragrance", slug: "home-fragrance-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-home-fragrance-bundle-pt", parentId: "tax-home-fragrance-bundle", slug: "home-fragrance-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" },

  { id: "tax-accessories-bundle", parentId: "tax-accessories", slug: "accessories-bundle", nameAr: "باكج", nameEn: "Bundle", type: "SUBCATEGORY", order: 100, status: "ACTIVE" },
  { id: "tax-accessories-bundle-pt", parentId: "tax-accessories-bundle", slug: "accessories-bundle-pt", nameAr: "باكج", nameEn: "Bundle", type: "PRODUCT_TYPE", order: 1, status: "ACTIVE" }
];

function mergeTaxonomyOverrides(base: TaxonomyNode[]): TaxonomyNode[] {
  return applyTaxonomyOverrides(base, OVERRIDES);
}

/** Merged taxonomy: base + permanent admin overrides. */
export const taxonomy: TaxonomyNode[] = mergeTaxonomyOverrides(BASE_TAXONOMY);

/** Slugs of user-added/overridden nodes — surfaced so empty ones can still show. */
export const CUSTOM_NODE_SLUGS: string[] = customNodeSlugs(OVERRIDES);

/** ROOT virtual node used by some helpers. */
export const TAXONOMY_ROOT: TaxonomyNode = {
  id: "tax-root",
  parentId: null,
  slug: "root",
  nameAr: "Luminous Derma",
  nameEn: "Luminous Derma",
  type: "ROOT",
  order: 0,
  status: "ACTIVE",
};

export function getTaxonomyNodeBySlug(slug: string): TaxonomyNode | undefined {
  return taxonomy.find((n) => n.slug === slug) ?? taxonomy.find((n) => n.legacySlugs?.includes(slug));
}

export function getTaxonomyNodeById(id: string): TaxonomyNode | undefined {
  return taxonomy.find((n) => n.id === id);
}

export function getTaxonomyChildren(parentId: string): TaxonomyNode[] {
  return taxonomy.filter((n) => n.parentId === parentId);
}

export function getTaxonomyDescendants(parentId: string): TaxonomyNode[] {
  const out: TaxonomyNode[] = [];
  const stack = [...getTaxonomyChildren(parentId)];
  while (stack.length) {
    const n = stack.pop()!;
    out.push(n);
    stack.push(...getTaxonomyChildren(n.id));
  }
  return out;
}

export function getTaxonomyParent(node: TaxonomyNode): TaxonomyNode | undefined {
  if (node.parentId === null) return undefined;
  return getTaxonomyNodeById(node.parentId);
}

export function getTaxonomyAncestors(node: TaxonomyNode): TaxonomyNode[] {
  const out: TaxonomyNode[] = [];
  let cur = getTaxonomyParent(node);
  while (cur) {
    out.push(cur);
    cur = getTaxonomyParent(cur);
  }
  return out.reverse();
}

export function getTaxonomyPath(node: TaxonomyNode): TaxonomyNode[] {
  return [...getTaxonomyAncestors(node), node];
}

export function getActiveTaxonomy(): TaxonomyNode[] {
  return taxonomy.filter((n) => n.status === "ACTIVE");
}

export function getCategories(): TaxonomyNode[] {
  return taxonomy.filter((n) => n.type === "CATEGORY").sort((a, b) => a.order - b.order);
}

export function getProductTypes(): TaxonomyNode[] {
  return taxonomy.filter((n) => n.type === "PRODUCT_TYPE");
}

export function getSubcategories(): TaxonomyNode[] {
  return taxonomy.filter((n) => n.type === "SUBCATEGORY");
}

// ─── Runtime (Supabase-backed) ────────────────────────────────────────────────
// Allows consumers to get fresh taxonomy without a server restart.

import type { CategoryProductOverride } from "@/src/lib/content-store";

let _runtimeTaxonomy: TaxonomyNode[] | null = null;
let _runtimeCategoryProducts: Record<string, CategoryProductOverride> = {};
let _runtimeCustomSlugs: string[] = [];

export async function fetchTaxonomyFromAPI(): Promise<{
  taxonomy: TaxonomyNode[];
  categoryProducts: Record<string, CategoryProductOverride>;
  customSlugs: string[];
}> {
  try {
    const res = await fetch("/api/content/taxonomy", { cache: "no-store" });
    if (!res.ok) return { taxonomy, categoryProducts: _runtimeCategoryProducts, customSlugs: CUSTOM_NODE_SLUGS };
    const data = await res.json();
    if (Array.isArray(data.taxonomy) && data.taxonomy.length > 0) {
      _runtimeTaxonomy = data.taxonomy;
      _runtimeCategoryProducts = data.categoryProducts ?? {};
      _runtimeCustomSlugs = data.customSlugs ?? [];
      return { taxonomy: _runtimeTaxonomy!, categoryProducts: _runtimeCategoryProducts, customSlugs: _runtimeCustomSlugs };
    }
  } catch {}
  return { taxonomy, categoryProducts: _runtimeCategoryProducts, customSlugs: CUSTOM_NODE_SLUGS };
}

export function getRuntimeTaxonomy(): TaxonomyNode[] {
  return _runtimeTaxonomy ?? taxonomy;
}

export function getRuntimeCategoryProducts(): Record<string, CategoryProductOverride> {
  return _runtimeCategoryProducts;
}

export function getRuntimeCustomSlugs(): string[] {
  return _runtimeCustomSlugs.length > 0 ? _runtimeCustomSlugs : CUSTOM_NODE_SLUGS;
}
