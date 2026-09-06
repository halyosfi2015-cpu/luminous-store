import path from "path";
import { promises as fs } from "fs";
import sharp from "sharp";

// Versioned cache forces the homepage stage to regenerate older soft cutouts.
const CUTOUT_DIR = path.join(process.cwd(), "public", "images", "stage-cutouts-v2");
const MAX_EDGE = 1200;

const inflight = new Map<string, Promise<string>>();

function resolveOriginal(productId: string, gallerySrc?: string): string | null {
  if (!gallerySrc) return null;
  if (/^https?:\/\//i.test(gallerySrc)) return gallerySrc;
  const clean = gallerySrc.split("?")[0];
  return path.join(process.cwd(), "public", clean.replace(/^\//, ""));
}

function isNearWhite(r: number, g: number, b: number): boolean {
  return (
    r >= 238 &&
    g >= 236 &&
    b >= 232 &&
    Math.abs(r - g) < 14 &&
    Math.abs(g - b) < 16 &&
    Math.abs(r - b) < 18
  );
}

/** Adaptive background match: compares against sampled background color(s). */
function makeBgMatcher(samples: { r: number; g: number; b: number }[]): (r: number, g: number, b: number) => boolean {
  const tol = 34 * 34 * 3;
  return (r, g, b) => {
    for (const s of samples) {
      const dr = r - s.r;
      const dg = g - s.g;
      const db = b - s.b;
      if (dr * dr + dg * dg + db * db <= tol) return true;
    }
    return false;
  };
}

async function processBuffer(input: Buffer, outPath: string): Promise<string> {
  const base = sharp(input, { failOn: "none" }).rotate().ensureAlpha();
  const meta = await base.metadata();

  let pipeline = sharp(input, { failOn: "none" }).rotate().ensureAlpha();
  if ((meta.width ?? 0) > MAX_EDGE || (meta.height ?? 0) > MAX_EDGE) {
    pipeline = pipeline.resize(MAX_EDGE, MAX_EDGE, { fit: "inside" });
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  const buf = Uint8ClampedArray.from(data);

  const idx = (x: number, y: number) => (y * w + x) * channels;
  const corners = [idx(0, 0), idx(w - 1, 0), idx(0, h - 1), idx(w - 1, h - 1)];
  const transparentSource = corners.every((ci) => buf[ci + 3] < 12);

  if (!transparentSource) {
    // Adaptive: sample the full border ring to learn the real bg color(s)
    // (handles off-white / light-gray / studio-gradient backdrops).
    const samples: { r: number; g: number; b: number }[] = [];
    let sr = 0, sg = 0, sb = 0, sc = 0;
    for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 60))) {
      for (const p of [idx(x, 0), idx(x, h - 1)]) {
        if (buf[p + 3] > 0) { sr += buf[p]; sg += buf[p + 1]; sb += buf[p + 2]; sc++; }
      }
    }
    for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 60))) {
      for (const p of [idx(0, y), idx(w - 1, y)]) {
        if (buf[p + 3] > 0) { sr += buf[p]; sg += buf[p + 1]; sb += buf[p + 2]; sc++; }
      }
    }
    if (sc > 0) samples.push({ r: sr / sc, g: sg / sc, b: sb / sc });
    // Also keep individual corner clusters (multi-tone backdrops)
    for (const ci of corners) {
      if (buf[ci + 3] > 0 && !samples.some((s) => Math.abs(s.r - buf[ci]) < 20 && Math.abs(s.g - buf[ci + 1]) < 20)) {
        samples.push({ r: buf[ci], g: buf[ci + 1], b: buf[ci + 2] });
      }
    }
    const isBg = makeBgMatcher(samples);

    const total = w * h;
    const visited = new Uint8Array(total);
    const stack: number[] = [];

    const pushIfBg = (p: number) => {
      if (!visited[p] && buf[p * channels + 3] > 0 && isBg(buf[p * channels], buf[p * channels + 1], buf[p * channels + 2])) {
        visited[p] = 1;
        stack.push(p);
      }
    };
    for (let x = 0; x < w; x++) { pushIfBg(x); pushIfBg((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { pushIfBg(y * w); pushIfBg(y * w + w - 1); }

    while (stack.length > 0) {
      const p = stack.pop()!;
      buf[p * channels + 3] = 0;
      const x = p % w;
      const y = (p / w) | 0;
      if (x > 0) pushIfBg(p - 1);
      if (x < w - 1) pushIfBg(p + 1);
      if (y > 0) pushIfBg(p - w);
      if (y < h - 1) pushIfBg(p + w);
    }

    // Feather edges: soften hard cut boundary into smooth alpha falloff
    for (let pass = 0; pass < 2; pass++) {
      const snapshot = Uint8ClampedArray.from(buf);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x;
          const o = p * channels + 3;
          if (snapshot[o] === 0) continue;
          let transparentNeighbors = 0;
          let alphaSum = 0;
          for (const n of [p - 1, p + 1, p - w, p + w]) {
            const na = snapshot[n * channels + 3];
            alphaSum += na;
            if (na === 0) transparentNeighbors++;
          }
          const avgA = alphaSum / 4;
          if (transparentNeighbors >= 3) buf[o] = Math.min(snapshot[o], 90);
          else if (transparentNeighbors === 2) buf[o] = Math.min(snapshot[o], 160);
          else if (transparentNeighbors === 1) buf[o] = Math.min(snapshot[o], Math.max(avgA, 200));
        }
      }
    }

    // Guard: if adaptive removal wiped almost everything, revert to conservative white-only removal.
    let kept = 0;
    for (let i = 3; i < buf.length; i += channels) if (buf[i] > 128) kept++;
    if (kept < total * 0.08) {
      let freshPipeline = sharp(input, { failOn: "none" }).rotate().ensureAlpha();
      if ((meta.width ?? 0) > MAX_EDGE || (meta.height ?? 0) > MAX_EDGE) {
        freshPipeline = freshPipeline.resize(MAX_EDGE, MAX_EDGE, { fit: "inside" });
      }
      const fresh = await freshPipeline.raw().toBuffer({ resolveWithObject: true });
      buf.set(Uint8ClampedArray.from(fresh.data));
      const visited2 = new Uint8Array(total);
      const stack2: number[] = [];
      const pushIfWhite = (p: number) => {
        if (!visited2[p] && buf[p * channels + 3] > 0 && isNearWhite(buf[p * channels], buf[p * channels + 1], buf[p * channels + 2])) {
          visited2[p] = 1;
          stack2.push(p);
        }
      };
      for (let x = 0; x < w; x++) { pushIfWhite(x); pushIfWhite((h - 1) * w + x); }
      for (let y = 0; y < h; y++) { pushIfWhite(y * w); pushIfWhite(y * w + w - 1); }
      while (stack2.length > 0) {
        const p = stack2.pop()!;
        buf[p * channels + 3] = 0;
        const x = p % w;
        const y = (p / w) | 0;
        if (x > 0) pushIfWhite(p - 1);
        if (x < w - 1) pushIfWhite(p + 1);
        if (y > 0) pushIfWhite(p - w);
        if (y < h - 1) pushIfWhite(p + w);
      }
    }
  }

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (buf[(y * w + x) * channels + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) throw new Error("fully transparent result");

  const pad = 6;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const chh = maxY - minY + 1;

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await sharp(Buffer.from(buf.buffer), { raw: { width: w, height: h, channels } })
    .extract({ left: minX, top: minY, width: cw, height: chh })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  return outPath;
}

async function generateCutout(productId: string, gallerySrc?: string): Promise<string> {
  const outPath = path.join(CUTOUT_DIR, `${productId}.png`);
  try {
    await fs.access(outPath);
    return outPath;
  } catch {}

  const originalPath = resolveOriginal(productId, gallerySrc);
  if (!originalPath) throw new Error(`no source for ${productId}`);

  let input: Buffer;
  if (/^https?:\/\//i.test(originalPath)) {
    const res = await fetch(originalPath);
    if (!res.ok) throw new Error(`fetch failed ${res.status}`);
    input = Buffer.from(await res.arrayBuffer());
  } else {
    input = await fs.readFile(originalPath);
  }
  return processBuffer(input, outPath);
}

export async function ensureCutout(productId: string, gallerySrc?: string): Promise<string> {
  const existing = inflight.get(productId);
  if (existing) return existing;
  const task = generateCutout(productId, gallerySrc).finally(() => inflight.delete(productId));
  inflight.set(productId, task);
  return task;
}

export async function readCachedCutout(productId: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(CUTOUT_DIR, `${productId}.png`));
  } catch {
    return null;
  }
}

export async function ensureCutouts(items: { id: string; src?: string }[]): Promise<{ ok: string[]; failed: string[] }> {
  const ok: string[] = [];
  const failed: string[] = [];
  await Promise.all(
    items.map(async ({ id, src }) => {
      try {
        await ensureCutout(id, src);
        ok.push(id);
      } catch {
        failed.push(id);
      }
    })
  );
  return { ok, failed };
}
