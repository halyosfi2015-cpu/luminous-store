import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سلة التسوق",
  description: "سلة التسوق الخاصة بك في Luminous Derma",
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
