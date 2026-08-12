import type { Metadata } from "next";
import AboutPageClient from "./AboutPageClient";

export const metadata: Metadata = {
  title: "من نحن - Luminous Derma",
  description:
    "أول منصة يمنية متخصصة تجمع عالم العناية بالبشرة والجمال في مكان واحد. تعرّف على قصتنا ورؤيتنا وقيمنا، ولماذا يثق بنا عملاؤنا.",
  alternates: { canonical: "https://luminousderma.com/about" },
  openGraph: {
    title: "من نحن - Luminous Derma",
    description:
      "أول منصة يمنية متخصصة تجمع عالم العناية بالبشرة والجمال في مكان واحد.",
    type: "website",
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
