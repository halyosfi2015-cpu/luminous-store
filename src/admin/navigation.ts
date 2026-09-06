import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  PackageSearch,
  Plus,
  Tags,
  Boxes,
  ShoppingCart,
  Users,
  UserSearch,
  MessageCircle,
  LayoutTemplate,
  PanelsTopLeft,
  Megaphone,
  Percent,
  Newspaper,
  Repeat,
  Gift,
  Stethoscope,
  Ticket,
  Star,
  ShieldCheck,
  BellRing,
  BarChart3,
  Receipt,
  Settings,
  Wrench,
  Truck,
  LineChart,
  Cpu,
  Bot,
  Target,
  Lightbulb,
  ClipboardCheck,
  SlidersHorizontal,
  Wand2,
  Rocket,
  Gauge,
  TrendingUp,
  HeartPulse,
  FileSearch,
  ImageIcon,
  ShoppingBag,
  ScrollText,
  ArrowLeftRight,
  CalendarDays,
  FileText,
  LayoutList,
  Activity,
  Network,
  Warehouse,
  MessageSquare,
  CheckCircle2,
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
    label: "مركز الذكاء الموحد",
    labelEn: "Unified Intelligence",
    href: "/admin/intelligence",
    resource: "ai",
    icon: Cpu,
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
        icon: PackageSearch,
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
      {
        label: "صحة الكتالوج",
        labelEn: "Catalog Health",
        href: "/admin/catalog-health",
        resource: "catalog_health",
        icon: HeartPulse,
      },
      {
        label: "التصنيف الرئيسي",
        labelEn: "Master Taxonomy",
        href: "/admin/taxonomy",
        resource: "catalog_health",
        icon: Network,
      },
      {
        label: "المصادر والتحقق",
        labelEn: "Sources & Verification",
        href: "/admin/sources",
        resource: "sources",
        icon: FileSearch,
      },
      {
        label: "مكتبة الوسائط",
        labelEn: "Media Library",
        href: "/admin/media",
        resource: "media",
        icon: ImageIcon,
      },
      {
        label: "التسويق والترتيب",
        labelEn: "Merchandising",
        href: "/admin/merchandising",
        resource: "merchandising",
        icon: ShoppingBag,
      },
      {
        label: "استيراد وتصدير",
        labelEn: "Import / Export",
        href: "/admin/import-export",
        resource: "import_export",
        icon: ArrowLeftRight,
      },
      {
        label: "سجل التدقيق",
        labelEn: "Audit Log",
        href: "/admin/audit",
        resource: "audit",
        icon: ScrollText,
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
    label: "الاستشارات والطلبات",
    labelEn: "Consultations & Leads",
    href: "/admin/consultations",
    resource: "customers",
    icon: MessageCircle,
  },
  {
    label: "تشخيص البشرة",
    labelEn: "Skin Quiz",
    href: "/admin/quiz-results",
    resource: "quiz_results",
    icon: ClipboardCheck,
  },
  {
    label: "مشاكل البشرة",
    labelEn: "Skin Concerns",
    href: "/admin/problemSolutions",
    resource: "content",
    icon: Stethoscope,
  },
  {
    label: "باقات وهدايا",
    labelEn: "Bundles & Gifts",
    resource: "bundles",
    icon: Gift,
    children: [
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
        icon: Package,
      },
      {
        label: "تسعير الباقات",
        labelEn: "Bundle Pricing",
        href: "/admin/bundle-pricing",
        resource: "bundles",
        icon: Percent,
      },
    ],
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
        icon: PanelsTopLeft,
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
        label: "الخبراء",
        labelEn: "Experts",
        href: "/admin/experts",
        resource: "experts",
        icon: Stethoscope,
      },
      {
        label: "منصة Luminous Stage",
        labelEn: "Luminous Stage",
        href: "/admin/luminous-stage",
        resource: "content",
        icon: ImageIcon,
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
    icon: UserSearch,
  },
  {
    label: "الذكاء التجاري",
    labelEn: "AI Commerce",
    icon: Bot,
    resource: "ai",
    children: [
      {
        label: "مساعد الذكاء",
        labelEn: "AI Chat",
        href: "/admin/intelligence/chat",
        resource: "ai",
        icon: MessageSquare,
      },
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
        icon: Wand2,
      },
      {
        label: "الإعدادات",
        labelEn: "Settings",
        href: "/admin/ai/settings",
        resource: "ai",
        icon: SlidersHorizontal,
      },
      {
        label: "مركز المحتوى",
        labelEn: "Content Center",
        href: "/admin/ai/content",
        resource: "content",
        icon: FileText,
        children: [
          {
            label: "نظرة عامة",
            labelEn: "Overview",
            href: "/admin/ai/content",
            resource: "content",
            icon: LayoutDashboard,
          },
          {
            label: "المحتوى",
            labelEn: "Content Items",
            href: "/admin/ai/content/items",
            resource: "content",
            icon: LayoutList,
          },
          {
            label: "المسودات",
            labelEn: "Drafts",
            href: "/admin/ai/content/drafts",
            resource: "content",
            icon: FileText,
          },
          {
            label: "المجدول",
            labelEn: "Scheduled",
            href: "/admin/ai/content/scheduled",
            resource: "content",
            icon: CalendarDays,
          },
          {
            label: "المنشور",
            labelEn: "Published",
            href: "/admin/ai/content/published",
            resource: "content",
            icon: CheckCircle2,
          },
          {
            label: "التقويم",
            labelEn: "Calendar",
            href: "/admin/ai/content/calendar",
            resource: "content",
            icon: CalendarDays,
          },
          {
            label: "الحملات",
            labelEn: "Campaigns",
            href: "/admin/ai/content/campaigns",
            resource: "content",
            icon: Megaphone,
          },
          {
            label: "الأفكار",
            labelEn: "Ideas",
            href: "/admin/ai/content/ideas",
            resource: "content",
            icon: Lightbulb,
          },
          {
            label: "الأداء",
            labelEn: "Performance",
            href: "/admin/ai/content/analytics",
            resource: "content",
            icon: BarChart3,
          },
          {
            label: "المحتوى المرئي",
            labelEn: "Visual Content",
            href: "/admin/ai/content/visual",
            resource: "content",
            icon: Wand2,
          },
          {
            label: "الإعدادات",
            labelEn: "Settings",
            href: "/admin/ai/content/settings",
            resource: "content",
            icon: Gauge,
          },
        ],
      },
    ],
  },
  {
    label: "تشغيل المتجر",
    labelEn: "Store Operations",
    icon: Activity,
    resource: "store_ops",
    children: [
      {
        label: "نظرة عامة",
        labelEn: "Overview",
        href: "/admin/store-ops",
        resource: "store_ops",
        icon: LayoutDashboard,
      },
      {
        label: "المخزون",
        labelEn: "Inventory",
        href: "/admin/store-ops?tab=inventory",
        resource: "store_ops",
        icon: Warehouse,
      },
      {
        label: "التنبيهات",
        labelEn: "Alerts",
        href: "/admin/store-ops?tab=alerts",
        resource: "store_ops",
        icon: ShieldCheck,
      },
      {
        label: "الفرص",
        labelEn: "Opportunities",
        href: "/admin/store-ops?tab=opportunities",
        resource: "store_ops",
        icon: Receipt,
      },
      {
        label: "المبيعات",
        labelEn: "Sales",
        href: "/admin/store-ops?tab=sales",
        resource: "store_ops",
        icon: BarChart3,
      },
      {
        label: "الأرباح",
        labelEn: "Finance",
        href: "/admin/store-ops?tab=finance",
        resource: "store_ops",
        icon: TrendingUp,
      },
      {
        label: "المنتجات",
        labelEn: "Products",
        href: "/admin/store-ops?tab=products",
        resource: "store_ops",
        icon: PackageSearch,
      },
      {
        label: "العملاء",
        labelEn: "Customers",
        href: "/admin/store-ops?tab=customers",
        resource: "store_ops",
        icon: Users,
      },
      {
        label: "الطلبات",
        labelEn: "Orders",
        href: "/admin/store-ops?tab=orders",
        resource: "store_ops",
        icon: ShoppingCart,
      },
      {
        label: "محلل المتجر",
        labelEn: "Store Analyst",
        href: "/admin/store-ops?tab=analyst",
        resource: "store_ops",
        icon: Bot,
      },
      {
        label: "التقارير",
        labelEn: "Reports",
        href: "/admin/store-ops?tab=reports",
        resource: "store_ops",
        icon: FileText,
      },
      {
        label: "الإعدادات",
        labelEn: "Settings",
        href: "/admin/store-ops?tab=settings",
        resource: "store_ops",
        icon: Wrench,
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
