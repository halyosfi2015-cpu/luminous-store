import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type ProductBreadcrumbProps = {
  category: string;
  categorySlug: string;
  productName: string;
};

export default function ProductBreadcrumb({
  category,
  categorySlug,
  productName,
}: ProductBreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb" className="pt-4">
      <ol className="flex max-w-full items-center gap-1.5 overflow-hidden text-xs text-muted sm:text-sm">
        <li className="shrink-0 whitespace-nowrap">
          <Link href="/" className="transition-colors hover:text-primary">
            الرئيسية
          </Link>
        </li>
        <ChevronLeft size={14} className="shrink-0 text-border-strong rtl:rotate-180" />
        <li className="shrink-0 whitespace-nowrap">
          <Link
            href={`/categories/${categorySlug}`}
            className="block max-w-[35vw] truncate transition-colors hover:text-primary"
          >
            {category}
          </Link>
        </li>
        <ChevronLeft size={14} className="shrink-0 text-border-strong rtl:rotate-180" />
        <li className="min-w-0 flex-1 truncate text-foreground font-medium">
          {productName}
        </li>
      </ol>
    </nav>
  );
}
