import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routines } from "@/src/data/products";
import RoutineDetailClient from "./RoutineDetailClient";

export function generateStaticParams() {
  return routines.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const routine = routines.find((r) => r.id === id);
  if (!routine) return {};
  return {
    title: `${routine.nameAr} - Luminous Derma`,
    description: routine.descriptionAr,
  };
}

export default async function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const routine = routines.find((r) => r.id === id);
  if (!routine) notFound();

  return <RoutineDetailClient routine={routine} />;
}
