"use client";

import Image from "next/image";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import Card from "@/components/ui/Card";
import { useAdminExperts } from "@/hooks/useAdminExperts";
import { getExpertImage } from "@/lib/expert-images";

export default function ExpertsGrid() {
  const experts = useAdminExperts();

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {experts.map((expert) => (
        <Link key={expert.id} href={`/experts/${expert.slug}`}>
          <Card className="flex flex-col items-center gap-4 p-6 text-center transition-shadow hover:shadow-card-hover">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted-bg">
              <Image
                src={getExpertImage(expert)}
                alt={expert.nameAr}
                width={96}
                height={96}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{expert.nameAr}</p>
              <p className="text-sm text-primary">{expert.titleAr}</p>
              <p className="mt-2 text-sm text-muted line-clamp-2">{expert.bioAr}</p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
