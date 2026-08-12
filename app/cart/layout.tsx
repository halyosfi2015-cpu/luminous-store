import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سلة التسوق",
  description: "سلة التسوق الخاصة بك في Luminous Derma",
  alternates: { canonical: "https://luminousderma.com/cart" },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
