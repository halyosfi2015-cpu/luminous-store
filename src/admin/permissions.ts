import type { AdminPermission, AdminResource, AdminRole } from "./types";

export const DEFAULT_ADMIN_ROLE: AdminRole = "super_admin";

export const ALL_ADMIN_RESOURCES: AdminResource[] = [
  "dashboard",
  "products",
  "categories",
  "brands",
  "orders",
  "customers",
  "hero",
  "banners",
  "offers",
  "articles",
  "routines",
  "bundles",
  "experts",
  "coupons",
  "reviews",
  "users",
  "reports",
  "settings",
  "shipping",
   "analytics",
   "customer_intelligence",
   "ai",
   "catalog_health",
   "sources",
   "media",
   "merchandising",
   "audit",
   "import_export",
   "content",
   "store_ops",
   "quiz_results",
];

type AccessSpec = { edit?: AdminResource[]; view?: AdminResource[] };

const buildAccess = (
  spec: AccessSpec,
): Record<AdminResource, AdminPermission[]> => {
  const record = {} as Record<AdminResource, AdminPermission[]>;
  for (const resource of ALL_ADMIN_RESOURCES) record[resource] = [];
  for (const resource of spec.view ?? []) {
    if (!record[resource].includes("view")) record[resource].push("view");
  }
  for (const resource of spec.edit ?? []) {
    if (!record[resource].includes("view")) record[resource].push("view");
    if (!record[resource].includes("edit")) record[resource].push("edit");
  }
  return record;
};

const fullAccess = (): Record<AdminResource, AdminPermission[]> =>
  buildAccess({ view: ALL_ADMIN_RESOURCES, edit: ALL_ADMIN_RESOURCES });

export const ROLE_RESOURCE_PERMISSIONS: Record<
  AdminRole,
  Record<AdminResource, AdminPermission[]>
> = {
  super_admin: fullAccess(),
  admin: buildAccess({
    view: ALL_ADMIN_RESOURCES,
    edit: ALL_ADMIN_RESOURCES.filter((resource) => resource !== "users"),
  }),
  content_manager: buildAccess({
    view: [
      "dashboard",
      "products",
      "categories",
      "brands",
      "hero",
      "banners",
      "offers",
      "articles",
      "routines",
      "bundles",
      "experts",
      "reviews",
       "settings",
       "shipping",
       "analytics",
       "customer_intelligence",
       "ai",
       "catalog_health",
       "sources",
      "media",
      "merchandising",
      "sources",
      "catalog_health",
      "content",
      "store_ops",
      "quiz_results",
    ],
     edit: [
       "hero",
      "banners",
      "offers",
      "articles",
      "routines",
      "bundles",
      "experts",
      "reviews",
      "media",
      "merchandising",
      "sources",
      "catalog_health",
      "content",
      "store_ops",
      "quiz_results",
    ],
  }),
  product_manager: buildAccess({
    view: [
      "dashboard",
      "products",
      "categories",
      "brands",
      "hero",
      "offers",
      "articles",
      "routines",
      "bundles",
      "experts",
      "reviews",
       "settings",
       "shipping",
       "analytics",
       "customer_intelligence",
       "ai",
       "catalog_health",
       "sources",
       "media",
"merchandising",
       "audit",
       "import_export",
       "content",
       "store_ops",
      ],
     edit: ["products", "categories", "brands", "bundles", "catalog_health", "sources", "media", "merchandising", "import_export", "audit", "content", "store_ops"],
  }),
  order_manager: buildAccess({
    view: [
      "dashboard",
      "products",
      "orders",
      "customers",
      "settings",
      "shipping",
      "reports",
      "analytics",
      "customer_intelligence",
      "ai",
      "content",
      "store_ops",
      "quiz_results",
    ],
    edit: ["orders", "customers", "settings", "shipping"],
  }),
  support: buildAccess({
    view: ["dashboard", "products", "orders", "customers", "reviews", "settings", "customer_intelligence", "ai", "content", "store_ops", "quiz_results"],
    edit: ["reviews", "quiz_results"],
  }),
};

export function getPermissionsForRole(
  role: AdminRole,
): Record<AdminResource, AdminPermission[]> {
  return ROLE_RESOURCE_PERMISSIONS[role];
}

export function can(
  role: AdminRole,
  resource: AdminResource,
  permission: AdminPermission,
): boolean {
  return ROLE_RESOURCE_PERMISSIONS[role][resource].includes(permission);
}

export function canAccess(
  role: AdminRole,
  resource: AdminResource,
): boolean {
  return ROLE_RESOURCE_PERMISSIONS[role][resource].length > 0;
}
