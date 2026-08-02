import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "إتمام الطلب",
  description: "إتمام عملية الشراء في Luminous Derma",
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
