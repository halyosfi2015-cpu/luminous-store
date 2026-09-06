import { NextResponse } from "next/server";
import { readLuminousStageOverrides } from "@/src/lib/content-store";
import {
  sanitizeConfigs,
  resolveStageSlides,
  defaultStageConfigs,
} from "@/lib/luminous-stage";

export const dynamic = "force-dynamic";

export async function GET() {
  const file = readLuminousStageOverrides();
  const sanitized = sanitizeConfigs(file);
  const configs = sanitized && sanitized.length > 0 ? sanitized : null;
  return NextResponse.json(
    {
      overrides: configs,
      resolved: configs
        ? resolveStageSlides(configs)
        : resolveStageSlides(defaultStageConfigs()),
    },
    // Admin saves must appear immediately — never serve a stale cached copy.
    { headers: { "Cache-Control": "no-store" } }
  );
}
