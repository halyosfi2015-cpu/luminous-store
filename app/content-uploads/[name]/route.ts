import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs";
import path from "path";
import { promisify } from "util";

/**
 * Serves admin-uploaded stage images from disk (public/uploads/stage).
 * Dynamic route so files uploaded after server start are served correctly.
 */

const readFileAsync = promisify(readFile);

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ name: string }> },
) {
  const { name } = await ctx.params;
  // Path traversal guard: allow only safe flat filenames we generated.
  if (!/^[A-Za-z0-9._-]+$/.test(name) || name.includes("..")) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const ext = path.extname(name).toLowerCase();
  const type = TYPES[ext];
  if (!type) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const buf = await readFileAsync(path.join(process.cwd(), "public", "uploads", "stage", name));
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
