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
      <ol className="flex items-center gap-1.5 text-sm text-muted">
        <li>
          <Link href="/" className="transition-colors hover:text-primary">
            الرئيسية
          </Link>
        </li>
        <ChevronLeft size={14} className="text-border-strong rtl:rotate-180" />
        <li>
          <Link
            href={`/categories/${categorySlug}`}
            className="transition-colors hover:text-primary"
          >
            {category}
          </Link>
        </li>
        <ChevronLeft size={14} className="text-border-strong rtl:rotate-180" />
        <li className="truncate text-foreground font-medium max-w-[200px] sm:max-w-md">
          {productName}
        </li>
      </ol>
    </nav>
  );
}
