import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Container from "@/components/ui/Container";

const WishlistContent = dynamic(() => import("@/components/product/WishlistContent"));

export const metadata: Metadata = {
  title: "المفضلة - Luminous Derma",
  description: "منتجاتك المفضلة في Luminous Derma — احتفظي بمنتجات العناية بالبشرة التي أعجبتك",
};

export default function WishlistPage() {
  return (
    <div dir="rtl" className="w-full py-10">
      <Container>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">المفضلة</h1>
        <p className="mt-1 text-sm text-muted">المنتجات التي احتفظت بها</p>
        <div className="mt-8">
          <WishlistContent />
        </div>
      </Container>
    </div>
  );
}
