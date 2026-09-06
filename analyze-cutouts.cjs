const fs = require("fs");
const path = require("path");
(async () => {
  const sharp = require("sharp");
  const CUT_DIR = path.join(process.cwd(), "public", "images", "stage-cutouts");
  if (!fs.existsSync(CUT_DIR)) { console.log("no cutouts dir"); return; }
  const files = fs.readdirSync(CUT_DIR).filter((f) => f.endsWith(".png"));
  console.log("total cutouts:", files.length);

  // slide product ids actually used on the homepage
  let usedIds = new Set();
  try {
    const j = JSON.parse(fs.readFileSync("src/data/content/luminous-stage.json", "utf8"));
    for (const s of j.slides || []) for (const p of s.products || []) if (p.id) usedIds.add(p.id);
  } catch {}
  console.log("stage-used products:", usedIds.size);

  const results = [];
  for (const f of files) {
    const id = f.replace(/\.png$/, "");
    try {
      const cutPath = path.join(CUT_DIR, f);
      const cutMeta = await sharp(cutPath).metadata();

      // find original
      let origPath = null;
      for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
        const candidates = [
          path.join(process.cwd(), "public", "images", "products", id + ext),
          path.join(process.cwd(), "public", "images", "products", id + "-01" + ext),
          path.join(process.cwd(), "public", "images", "products", id.toLowerCase() + ext),
        ];
        for (const c of candidates) { if (fs.existsSync(c)) { origPath = c; break; } }
        if (origPath) break;
      }
      if (!origPath) { results.push({ id, status: "no-original" }); continue; }

      // analyze original: raw RGB
      const origRaw = await sharp(origPath).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const ow = origRaw.info.width, oh = origRaw.info.height, och = origRaw.info.channels;
      const od = origRaw.data;
      const isNearWhite = (i) => {
        const r = od[i], g = od[i+1], b = od[i+2];
        return r >= 238 && g >= 236 && b >= 232 && Math.abs(r-g) < 14 && Math.abs(g-b) < 16 && Math.abs(r-b) < 18;
      };

      // flood-fill from borders on ORIGINAL (same as pipeline) to get "removed set"
      const total = ow * oh;
      const visited = new Uint8Array(total);
      const stack = [];
      const pushIfBg = (p) => { if (!visited[p] && od[p*och+3] > 0 && isNearWhite(p*och)) { visited[p]=1; stack.push(p); } };
      for (let x=0;x<ow;x++){ pushIfBg(x); pushIfBg((oh-1)*ow+x); }
      for (let y=0;y<oh;y++){ pushIfBg(y*ow); pushIfBg(y*ow+ow-1); }
      while (stack.length){ const p=stack.pop(); const x=p%ow, y=(p/ow)|0;
        if(x>0)pushIfBg(p-1); if(x<ow-1)pushIfBg(p+1); if(y>0)pushIfBg(p-ow); if(y<oh-1)pushIfBg(p+ow); }

      // removed pixels = flood-filled (background). kept = rest.
      // HOLE metric: removed pixels far from any border (>6% of min dim) = eaten interior whites.
      const margin = Math.floor(Math.min(ow, oh) * 0.06);
      let holesDeep = 0, holesTotal = 0;
      for (let y=0;y<oh;y++) for (let x=0;x<ow;x++) {
        const p=y*ow+x;
        if (visited[p]) { holesTotal++;
          const d = Math.min(x, y, ow-1-x, oh-1-y);
          if (d > margin) holesDeep++; } }

      // edge feathering damage: kept pixels adjacent to removed with alpha reduction estimate
      let edgeKept = 0;
      for (let y=1;y<oh-1;y++) for (let x=1;x<ow-1;x++) {
        const p=y*ow+x;
        if (visited[p]) continue;
        let n=0;
        if(visited[p-1])n++; if(visited[p+1])n++; if(visited[p-ow])n++; if(visited[p+ow])n++;
        if(n>=2) edgeKept++;
      }

      results.push({
        id, status: "ok",
        origW: ow, origH: oh,
        cutW: cutMeta.width, cutH: cutMeta.height,
        bgRemovedPct: +(holesTotal / total * 100).toFixed(1),
        deepHolesPx: holesDeep,
        deepHolesPct: +(holesDeep / total * 100).toFixed(2),
        edgeFeatherPx: edgeKept,
        usedOnStage: usedIds.has(id),
      });
    } catch (e) { results.push({ id, status: "error:" + e.message.slice(0,60) }); }
  }
  fs.writeFileSync("cutout-analysis.json", JSON.stringify(results, null, 2));
  const ok = results.filter(r=>r.status==="ok");
  const damaged = ok.filter(r=>r.deepHolesPct >= 0.5); // ?0.5% of image area = visible interior loss
  const risky = ok.filter(r=>r.deepHolesPct > 0 && r.deepHolesPct < 0.5);
  console.log("analyzed:", ok.length, "| damaged(interior holes>=0.5%):", damaged.length, "| minor:", risky.length);
  console.log("--- TOP DAMAGED ---");
  damaged.sort((a,b)=>b.deepHolesPct-a.deepHolesPct).slice(0,15).forEach(d=>
    console.log(`${d.id} | holes ${d.deepHolesPct}% (${d.deepHolesPx}px) | edge-feather ${d.edgeFeatherPx}px | orig ${d.origW}x${d.origH} | onStage:${d.usedOnStage}`));
})();
