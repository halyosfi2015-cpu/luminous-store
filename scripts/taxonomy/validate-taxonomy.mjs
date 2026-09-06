#!/usr/bin/env node
/**
 * ============================================================================
 * MASTER TAXONOMY — INTEGRITY VALIDATION
 * ============================================================================
 * Validates:
 *   1. src/data/taxonomy.ts        (taxonomy tree integrity)
 *   2. src/lib/taxonomy/product-mappings.ts   (mapping integrity vs taxonomy)
 *
 * Checks:
 *   taxonomy tree:
 *     - unique ids and slugs
 *     - valid parents (no dangling parentId, no self-parent)
 *     - no circular hierarchy
 *     - no orphan nodes
 *     - every PRODUCT_TYPE has a SUBCATEGORY parent
 *     - status in {ACTIVE, FUTURE, HIDDEN}
 *     - legacySlugs unique across the tree (no ambiguous legacy mapping)
 *   mappings:
 *     - every MAPPED product references a real taxonomy slug
 *     - every product has exactly one mapping entry
 *     - REVIEW_REQUIRED entries reference existing proposed slugs (soft warn)
 *
 * USAGE:  node scripts/taxonomy/validate-taxonomy.mjs
 * EXIT:   0 on success, 1 on failure
 * ============================================================================
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const errors = [];
const warnings = [];

/* ────────────────────────────── Load taxonomy ─────────────────────────────── */
function loadTaxonomy() {
  const src = readFileSync(join(root, "src/data/taxonomy.ts"), "utf8");
  const nodes = [];
  for (const rawLine of src.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("{ id: ")) continue;
    const id = /id:\s*"([^"]+)"/.exec(line)?.[1];
    const slug = /slug:\s*"([^"]+)"/.exec(line)?.[1];
    const type = /type:\s*"([^"]+)"/.exec(line)?.[1];
    const status = /status:\s*"([^"]+)"/.exec(line)?.[1];
    const parentRaw = /parentId:\s*("([^"]+)"|null)/.exec(line)?.[1];
    const legacyRaw = /legacySlugs:\s*\[([^\]]*)\]/.exec(line)?.[1];
    if (!id || !slug || !type) continue;
    nodes.push({
      id,
      slug,
      type,
      status: status || "ACTIVE",
      parentId: parentRaw === "null" ? null : parentRaw.replace(/"/g, ""),
      legacySlugs: legacyRaw
        ? [...legacyRaw.matchAll(/"([^"]+)"/g)].map((m) => m[1])
        : [],
    });
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  return { nodes, byId, bySlug };
}

const { nodes, byId, bySlug } = loadTaxonomy();

/* ────────────────────────────── 1. Tree checks ────────────────────────────── */
const idSet = new Set();
const slugSet = new Set();
const legacyOwners = new Map();

for (const n of nodes) {
  if (idSet.has(n.id)) errors.push(`Duplicate node id: ${n.id}`);
  idSet.add(n.id);
  if (slugSet.has(n.slug)) errors.push(`Duplicate node slug: ${n.slug}`);
  slugSet.add(n.slug);

  if (!["ROOT", "CATEGORY", "SUBCATEGORY", "PRODUCT_TYPE"].includes(n.type))
    errors.push(`${n.id}: invalid type "${n.type}"`);
  if (!["ACTIVE", "FUTURE", "HIDDEN"].includes(n.status))
    errors.push(`${n.id}: invalid status "${n.status}"`);

  if (n.parentId !== null) {
    if (n.parentId === n.id) errors.push(`${n.id}: self-parent`);
    if (!byId.has(n.parentId)) errors.push(`${n.id}: dangling parentId "${n.parentId}"`);
  } else if (n.type !== "CATEGORY" && n.type !== "ROOT") {
    errors.push(`${n.id}: non-category node has null parent`);
  }

  if (n.type === "PRODUCT_TYPE") {
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    if (!parent || parent.type !== "SUBCATEGORY")
      errors.push(`${n.id}: PRODUCT_TYPE parent must be SUBCATEGORY`);
  }

  for (const legacy of n.legacySlugs) {
    if (legacyOwners.has(legacy)) {
      errors.push(`legacySlug "${legacy}" mapped by both ${legacyOwners.get(legacy)} and ${n.id}`);
    } else {
      legacyOwners.set(legacy, n.id);
    }
  }
}

/* Circular hierarchy + orphan check (walk from category roots). */
const reachable = new Set();
const stack = nodes.filter((n) => n.parentId === null).map((n) => n.id);
while (stack.length) {
  const id = stack.pop();
  if (reachable.has(id)) continue;
  reachable.add(id);
  for (const c of nodes.filter((n) => n.parentId === id)) stack.push(c.id);
}
for (const n of nodes) {
  if (n.type === "ROOT") continue;
  if (!reachable.has(n.id)) errors.push(`orphan node (not reachable from a root): ${n.id} (${n.slug})`);
}

/* ────────────────────────────── 2. Mapping checks ─────────────────────────── */
const mappingSrc = readFileSync(join(root, "src/lib/taxonomy/product-mappings.ts"), "utf8");
const mappedLines = [...mappingSrc.matchAll(/\n(\s*)"(yq-\d+)":\s*\{ productId:/g)].map((m) => m[2]);
const mappedIds = new Set(mappedLines);

const duplicateMappingIds = mappedLines.filter((id, i) => mappedLines.indexOf(id) !== i);
for (const d of duplicateMappingIds) errors.push(`duplicate mapping entry for ${d}`);

for (const m of mappingSrc.matchAll(/\{ productId: "([^"]+)", categorySlug: "([^"]+)", subcategorySlug: "([^"]+)", productTypeSlug: "([^"]+)"/g)) {
  const [, , cat, sub, pt] = m;
  for (const [slug, role] of [[cat, "categorySlug"], [sub, "subcategorySlug"], [pt, "productTypeSlug"]]) {
    if (!bySlug.has(slug)) errors.push(`mapping references unknown taxonomy slug "${slug}" (${role})`);
  }
}

/* SOFT: proposed slugs on review items should exist (warning only). */
for (const m of mappingSrc.matchAll(/proposedCategory: "([^"]+)", proposedSubcategory: "([^"]+)", proposedProductType: "([^"]+)"/g)) {
  for (const [slug, role] of [[m[1], "proposedCategory"], [m[2], "proposedSubcategory"], [m[3], "proposedProductType"]]) {
    if (!bySlug.has(slug)) warnings.push(`review proposal references unknown slug "${slug}" (${role})`);
  }
}

/* ────────────────────────────── Report ─────────────────────────────── */
console.log(`Taxonomy nodes      : ${nodes.length}`);
console.log(`MAPPED products     : ${mappedIds.size}`);
console.log(`Errors              : ${errors.length}`);
console.log(`Warnings            : ${warnings.length}`);
if (errors.length) {
  console.log("\n── ERRORS ──");
  for (const e of errors) console.log("  ✗", e);
}
if (warnings.length) {
  console.log("\n── WARNINGS ──");
  for (const w of warnings.slice(0, 30)) console.log("  ⚠", w);
  if (warnings.length > 30) console.log(`  …and ${warnings.length - 30} more`);
}
process.exit(errors.length === 0 ? 0 : 1);