import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Plus,
  Tags,
  Boxes,
  ShoppingCart,
  Users,
  LayoutTemplate,
  Sparkles,
  Megaphone,
  Percent,
  Newspaper,
  Repeat,
  Gift,
  Stethoscope,
  Ticket,
  Star,
  ShieldCheck,
  BarChart3,
  Settings,
  Truck,
  LineChart,
  Brain,
  TrendingUp,
} from "lucide-react";
import type { AdminResource } from "./types";

export type AdminNavItem = {
  label: string;
  labelEn: string;
  href?: string;
  resource?: AdminResource;
  icon?: LucideIcon;
  children?: AdminNavItem[];
};

export const adminNavigation: AdminNavItem[] = [
  {
    label: "لوحة التحكم",
    labelEn: "Dashboard",
    href: "/admin",
    resource: "dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "المنتجات",
    labelEn: "Products",
    resource: "products",
    icon: Package,
    children: [
      {
        label: "كل المنتجات",
        labelEn: "All Products",
        href: "/admin/products",
        resource: "products",
        icon: Package,
      },
      {
        label: "إضافة منتج",
        labelEn: "Add New Product",
        href: "/admin/products/new",
        resource: "products",
        icon: Plus,
      },
      {
        label: "التصنيفات",
        labelEn: "Categories",
        href: "/admin/categories",
        resource: "categories",
        icon: Tags,
      },
      {
        label: "العلامات التجارية",
        labelEn: "Brands",
        href: "/admin/brands",
        resource: "brands",
        icon: Boxes,
      },
    ],
  },
  {
    label: "الطلبات",
    labelEn: "Orders",
    href: "/admin/orders",
    resource: "orders",
    icon: ShoppingCart,
  },
  {
    label: "العملاء",
    labelEn: "Customers",
    href: "/admin/customers",
    resource: "customers",
    icon: Users,
  },
  {
    label: "المحتوى / الرئيسية",
    labelEn: "Content / Homepage",
    icon: LayoutTemplate,
    children: [
      {
        label: "أقسام الرئيسية",
        labelEn: "Homepage Sections",
        href: "/admin/homepage",
        resource: "hero",
        icon: LayoutTemplate,
      },
      {
        label: "الواجهة الرئيسية",
        labelEn: "Hero",
        href: "/admin/hero",
        resource: "hero",
        icon: Sparkles,
      },
      {
        label: "البانرات",
        labelEn: "Banners",
        href: "/admin/banners",
        resource: "banners",
        icon: Megaphone,
      },
      {
        label: "العروض",
        labelEn: "Offers",
        href: "/admin/offers",
        resource: "offers",
        icon: Percent,
      },
      {
        label: "المقالات",
        labelEn: "Articles",
        href: "/admin/articles",
        resource: "articles",
        icon: Newspaper,
      },
      {
        label: "الروتينات",
        labelEn: "Routines",
        href: "/admin/routines",
        resource: "routines",
        icon: Repeat,
      },
      {
        label: "الباقات",
        labelEn: "Bundles",
        href: "/admin/bundles",
        resource: "bundles",
        icon: Gift,
      },
      {
        label: "خيارات الهدايا",
        labelEn: "Gift Options",
        href: "/admin/gift-options",
        resource: "bundles",
        icon: Gift,
      },
      {
        label: "الخبراء",
        labelEn: "Experts",
        href: "/admin/experts",
        resource: "experts",
        icon: Stethoscope,
      },
    ],
  },
  {
    label: "القسائم",
    labelEn: "Coupons",
    href: "/admin/coupons",
    resource: "coupons",
    icon: Ticket,
  },
  {
    label: "التقييمات",
    labelEn: "Reviews",
    href: "/admin/reviews",
    resource: "reviews",
    icon: Star,
  },
  {
    label: "المستخدمون والأدوار",
    labelEn: "Users & Roles",
    href: "/admin/users",
    resource: "users",
    icon: ShieldCheck,
  },
  {
    label: "التقارير",
    labelEn: "Reports",
    href: "/admin/reports",
    resource: "reports",
    icon: BarChart3,
  },
  {
    label: "التحليلات",
    labelEn: "Analytics",
    href: "/admin/analytics",
    resource: "analytics",
    icon: LineChart,
  },
  {
    label: "ذكاء العملاء",
    labelEn: "Customer Intelligence",
    href: "/admin/customer-intelligence",
    resource: "customer_intelligence",
    icon: Brain,
  },
  {
    label: "الذكاء التجاري",
    labelEn: "AI Commerce",
    icon: Brain,
    resource: "ai",
    children: [
      {
        label: "نظرة عامة",
        labelEn: "Overview",
        href: "/admin/ai",
        resource: "ai",
        icon: LayoutDashboard,
      },
      {
        label: "العملاء",
        labelEn: "Customers",
        href: "/admin/ai/customers",
        resource: "customer_intelligence",
        icon: Users,
      },
      {
        label: "التوصيات",
        labelEn: "Recommendations",
        href: "/admin/ai/recommendations",
        resource: "ai",
        icon: BarChart3,
      },
      {
        label: "نية الشراء",
        labelEn: "Purchase Intent",
        href: "/admin/ai/purchase-intent",
        resource: "ai",
        icon: TrendingUp,
      },
      {
        label: "شرائح العملاء",
        labelEn: "Segments",
        href: "/admin/ai/segments",
        resource: "ai",
        icon: Users,
      },
      {
        label: "الحملات",
        labelEn: "Campaigns",
        href: "/admin/ai/campaigns",
        resource: "ai",
        icon: Megaphone,
      },
      {
        label: "التخصيص",
        labelEn: "Personalization",
        href: "/admin/ai/personalization",
        resource: "ai",
        icon: Sparkles,
      },
      {
        label: "الإعدادات",
        labelEn: "Settings",
        href: "/admin/ai/settings",
        resource: "ai",
        icon: Settings,
      },
    ],
  },
  {
    label: "الإعدادات",
    labelEn: "Settings",
    resource: "settings",
    icon: Settings,
    children: [
      {
        label: "رسوم التوصيل",
        labelEn: "Shipping",
        href: "/admin/shipping",
        resource: "shipping",
        icon: Truck,
      },
    ],
  },
];

export const ADMIN_ROLE_LABELS: Record<string, string> = {
  super_admin: "مشرف عام",
  admin: "مدير",
  content_manager: "مدير محتوى",
  product_manager: "مدير منتجات",
  order_manager: "مدير طلبات",
  support: "دعم العملاء",
};

export function isAdminNavPathActive(pathname: string, href?: string): boolean {
  if (!href) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function findNavTrail(
  pathname: string,
  predicate: (href: string) => boolean,
): AdminNavItem[] {
  const trail: AdminNavItem[] = [];
  const walk = (items: AdminNavItem[]): boolean => {
    for (const item of items) {
      if (item.href && predicate(item.href)) {
        trail.push(item);
        return true;
      }
      if (item.children && walk(item.children)) {
        trail.unshift(item);
        return true;
      }
    }
    return false;
  };
  walk(adminNavigation);
  return trail;
}

/**
 * Resolve the navigation trail for a pathname.
 * Exact matches take priority (e.g. `/admin/products/new`), then the longest
 * ancestor-segment match so dynamic routes (`/admin/products/:id`) resolve to
 * their section — keeping breadcrumbs and the shell permission gate consistent.
 */
export function getAdminNavPath(pathname: string): AdminNavItem[] {
  const exact = findNavTrail(pathname, (href) => href === pathname);
  if (exact.length > 0) return exact;

  let bestHref: string | undefined;
  const collect = (items: AdminNavItem[]) => {
    for (const item of items) {
      if (item.href && isAdminNavPathActive(pathname, item.href)) {
        if (!bestHref || item.href.length > bestHref.length) bestHref = item.href;
      }
      if (item.children) collect(item.children);
    }
  };
  collect(adminNavigation);

  return bestHref ? findNavTrail(pathname, (href) => href === bestHref) : [];
}
