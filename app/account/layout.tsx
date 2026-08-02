import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "حسابي",
  description: "لوحة التحكم الخاصة بحسابك في Luminous Derma",
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
