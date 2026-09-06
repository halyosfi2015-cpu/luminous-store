"use client";

import { useState, useEffect } from "react";
import { fetchTaxonomyFromAPI } from "@/src/data/taxonomy";
import type { TaxonomyNode } from "@/src/types/taxonomy";

export function useTaxonomy() {
  const [taxonomy, setTaxonomy] = useState<TaxonomyNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaxonomyFromAPI().then((result) => {
      setTaxonomy(result.taxonomy);
      setLoading(false);
    });
  }, []);

  return { taxonomy, loading };
}
