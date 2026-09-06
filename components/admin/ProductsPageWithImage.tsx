"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import ResourcePage from "@/components/admin/ResourcePage";
import Button from "@/components/ui/Button";
import ImageSearchModal from "@/components/admin/ImageSearchModal";

type ProductRow = {
  id: string;
  name: { ar: string; en: string };
  brand?: string;
  brandAr?: string;
  image?: string;
  gallery?: string[];
};

export default function ProductsPageWithImage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);

  return (
    <>
      <ResourcePage
        resource="products"
        headerActions={
          <Link href="/admin/import-export">
            <Button variant="outline" size="sm" type="button">
              <FileText className="h-4 w-4" />
              استيراد / تصدير
            </Button>
          </Link>
        }
        extraActions={(row, reload) => {
          const p = row as ProductRow;
          const img = p.image || p.gallery?.[0] || "";
          return (
            <button
              type="button"
              onClick={() => {
                setSelectedProduct({ ...p, image: img });
                setSearchOpen(true);
              }}
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-primary transition-colors hover:text-primary-700"
              title="تحديث الصورة: بحث Google أو لصق مباشر أو رفع من اللابتوب"
            >
              <Search className="h-3.5 w-3.5" />
              تحديث الصورة
            </button>
          );
        }}
      />
      {selectedProduct && (
        <ImageSearchModal
          open={searchOpen}
          productId={selectedProduct.id}
          productName={selectedProduct.name.ar}
          brand={selectedProduct.brandAr || selectedProduct.brand || ""}
          currentImage={selectedProduct.image}
          onClose={() => {
            setSearchOpen(false);
            setSelectedProduct(null);
          }}
          onSaved={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
