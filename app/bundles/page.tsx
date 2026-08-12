import type { Metadata } from "next";
import BundlesClient from "./BundlesClient";

export const metadata: Metadata = {
  title: "باقات وهدايا - Luminous Derma",
  description:
    "باقات مختارة بعناية لكل مناسبة — خطوبة، زفاف، أعياد وصيف. وفّري حتى 25% مع باقات Luminous Derma، أو صممي باقتك الخاصة.",
  alternates: { canonical: "https://luminousderma.com/bundles" },
};

export default function BundlesPage() {
  return <BundlesClient />;
}
