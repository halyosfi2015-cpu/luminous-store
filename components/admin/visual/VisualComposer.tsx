"use client";

import type { ReactNode } from "react";

/**
 * PART 2 / P5 — VisualComposer: client-side preview renderer for the 35 templates.
 * One branch per layout family (35 distinct structures sharing primitives).
 * - Real product images only (object-contain, never stretched/covered).
 * - Official logo + verified brand tokens (#4B2A6F / #d4af37 / #FFF7F2).
 * - RTL native. Formats 1:1, 4:5, 9:16 via aspect ratio.
 */

export interface ComposeInput {
  templateId: string;
  family: string;
  copy: {
    hook: string;
    headline: string;
    subheadline: string;
    body: string | null;
    benefits: string[];
    cta: string;
    checks?: string[];
    faqs?: { q: string; a: string }[];
    branches?: { label: string; target: string }[];
    caption?: string;
    hashtags?: string[];
  };
  images: string[];
  productName: string;
  brandAr: string;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  rating: number | null;
  reviewCount: number;
  offerLabel: string | null;
  deadlineLabel: string | null;
  ingredient: string | null;
  concernLabel: string | null;
  steps: { titleAr: string }[];
  reviewSnippet: string | null;
  quote: string | null;
  trust: "none" | "light" | "standard";
  format: "1:1" | "4:5" | "9:16";
  /**
   * Path B freeform: AI-authored spec executed as-is. The renderer invents
   * nothing — untrusted specs are rejected by validateFreeformSpec upstream.
   */
  freeform?: { spec: import("@/src/lib/visual-studio/freeform-spec").FreeformSpec };
}

const LOGO = "/images/logo/luminous-derma-full-logo.png";

function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-[#f4f1f7] text-xs text-[#6c6576] ${className ?? ""}`}>
        لا توجد صورة موثقة
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`object-contain ${className ?? ""}`} loading="lazy" />;
}

function Logo({ small }: { small?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={LOGO} alt="Luminous Derma" className={small ? "h-5 object-contain" : "h-7 object-contain"} loading="lazy" />
  );
}

function Cta({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-5 py-2 text-sm font-bold ${
        dark ? "bg-[#d4af37] text-[#251836]" : "bg-[#4B2A6F] text-white"
      }`}
    >
      {label}
    </span>
  );
}

function Trust({ level }: { level: ComposeInput["trust"] }) {
  if (level === "none") return null;
  const items = level === "standard"
    ? ["منتجات أصلية", "توصيل", "دعم ومساعدة"]
    : ["منتجات مختارة بعناية"];
  return (
    <div className="flex items-center justify-center gap-2 text-[10px] text-[#6c6576]">
      {items.map((t) => (
        <span key={t} className="rounded-full border border-[#e8e4ee] px-2 py-0.5">✓ {t}</span>
      ))}
    </div>
  );
}

function Price({ p }: { p: ComposeInput }) {
  if (p.price == null) return null;
  return (
    <div className="flex items-baseline justify-center gap-2">
      <span className="text-xl font-black text-[#4B2A6F]">{p.price} {p.currency === "YER" ? "ر.ي" : p.currency}</span>
      {p.originalPrice != null && p.originalPrice > p.price && (
        <span className="text-sm text-[#6c6576] line-through">{p.originalPrice}</span>
      )}
    </div>
  );
}

const aspectFor = (f: ComposeInput["format"]) =>
  f === "1:1" ? "aspect-square" : f === "9:16" ? "aspect-[9/16]" : "aspect-[4/5]";

type SpecT = import("@/src/lib/visual-studio/freeform-spec").FreeformSpec;
type SpecNodeT = import("@/src/lib/visual-studio/freeform-spec").SpecNode;

/**
 * Executes a validated AI-authored spec. Fixed primitives only (official
 * logo, brand CTA, verified images object-contain) — the ARRANGEMENT is
 * the AI's. Defensive depth guard mirrors the validator.
 */
function SpecNodeView({ node, p, depth }: { node: SpecNodeT; p: ComposeInput; depth: number }) {
  if (depth > 4) return null;
  const grow = node.weight === 2 ? "flex-[2]" : node.weight === 3 ? "flex-[3]" : "flex-1";
  switch (node.type) {
    case "column":
      return (
        <div className={`flex min-h-0 min-w-0 flex-col ${grow}`}>
          {(node.children ?? []).map((c, i) => <SpecNodeView key={i} node={c} p={p} depth={depth + 1} />)}
        </div>
      );
    case "row":
      return (
        <div className={`flex min-h-0 min-w-0 flex-row ${grow}`}>
          {(node.children ?? []).map((c, i) => <SpecNodeView key={i} node={c} p={p} depth={depth + 1} />)}
        </div>
      );
    case "product": {
      const src = p.images[node.productIndex ?? 0] ?? "";
      return (
        <div className={`flex min-h-0 min-w-0 items-center justify-center p-1 ${grow}`}>
          <Img src={src} alt={p.productName} className="max-h-full max-w-full drop-shadow-lg" />
        </div>
      );
    }
    case "text": {
      const alignCls = node.align === "center" ? "text-center" : node.align === "end" ? "text-end" : "text-start";
      const scale = (base: string, lg: string, sm: string) =>
        node.size === "lg" ? lg : node.size === "sm" ? sm : base;
      const map = {
        headline: <p className={`${scale("text-lg", "text-xl", "text-base")} font-black leading-snug ${alignCls}`}>{p.copy.headline}</p>,
        sub: <p className={`${scale("text-xs", "text-sm", "text-[10px]")} text-[#6c6576] ${alignCls}`}>{p.copy.subheadline}</p>,
        body: <p className={`${scale("text-[11px]", "text-xs", "text-[10px]")} leading-relaxed ${alignCls}`}>{p.copy.body ?? p.copy.subheadline}</p>,
        angle: <p className={`${scale("text-[11px]", "text-xs", "text-[10px]")} font-bold tracking-widest text-[#7A3E9D] ${alignCls}`}>{p.copy.hook}</p>,
      } as const;
      const el = (map as Record<string, ReactNode>)[node.slot ?? "sub"] ?? map.sub;
      return <div className={`flex min-h-0 min-w-0 flex-col justify-center p-1.5 ${grow}`}>{el}</div>;
    }
    case "cta":
      return <div className="flex items-center justify-center p-2"><Cta label={p.copy.cta} /></div>;
    case "logo":
      return <div className="flex items-center justify-center p-2"><Logo small /></div>;
    case "price":
      return <div className="p-1 text-center"><Price p={p} /></div>;
    case "badge":
      return (
        <div className="flex items-center justify-center p-1">
          <span className="rounded-full bg-[#d4af37] px-3 py-1 text-[11px] font-black text-[#251836]">{node.label ?? ""}</span>
        </div>
      );
    case "trust":
      return <div className="p-1.5"><Trust level={p.trust === "none" ? "light" : p.trust} /></div>;
    case "spacer":
      return <div className={grow} />;
    default:
      return null;
  }
}

function SpecCanvas({ spec, p }: { spec: SpecT; p: ComposeInput }) {
  const bg = spec.bgTint === "orchid" ? "bg-[#f7f2fc]" : spec.bgTint === "gold" ? "bg-[#fbf6e6]" : "bg-[#FFF7F2]";
  return (
    <div className={`relative flex w-full ${aspectFor(spec.format)} flex-col overflow-hidden ${bg} text-right text-[#1c1726]`} dir="rtl">
      <div className="flex min-h-0 flex-1">
        <SpecNodeView node={spec.root} p={p} depth={1} />
      </div>
    </div>
  );
}

export default function VisualComposer({ input }: { input: ComposeInput }) {
  const p = input;
  const img0 = p.images[0] ?? "";
  const wrap = `relative flex w-full ${aspectFor(p.format)} flex-col overflow-hidden bg-[#FFF7F2] text-right text-[#1c1726]`;

  switch (p.family) {
    case "monument": return (
      <div className={wrap} dir="rtl">
        <div className="flex flex-1 items-center justify-center p-4"><Img src={img0} alt={p.productName} className="max-h-full w-4/5 drop-shadow-xl" /></div>
        <div className="space-y-1 p-4 text-center">
          <p className="text-lg font-black">{p.copy.headline}</p>
          <p className="text-xs text-[#6c6576]">{p.productName}</p>
          <Price p={p} /><Cta label={p.copy.cta} />
        </div>
      </div>
    );
    case "feature-first": return (
      <div className={wrap} dir="rtl">
        <p className="bg-[#4B2A6F] p-4 text-center text-3xl font-black text-[#F7D98C]">{p.ingredient ?? p.copy.headline}</p>
        <p className="p-2 text-center text-xs">{p.copy.subheadline}</p>
        <div className="flex flex-1 items-end justify-center p-3"><Img src={img0} alt={p.productName} className="h-2/5" /></div>
        <div className="p-3 text-center"><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "chips": return (
      <div className={wrap} dir="rtl">
        <p className="p-3 text-center text-base font-black">{p.copy.headline}</p>
        <div className="flex items-center justify-center gap-2 px-3">
          <Img src={img0} alt={p.productName} className="h-40" />
          <div className="space-y-1.5">
            {p.copy.benefits.slice(0, 3).map((b) => (
              <span key={b} className="block rounded-xl bg-white px-2 py-1 text-[11px] font-bold shadow-sm">✓ {b}</span>
            ))}
          </div>
        </div>
        <div className="mt-auto space-y-2 p-3 text-center"><Cta label={p.copy.cta} /><Trust level={p.trust} /></div>
      </div>
    );
    case "curiosity-gap": return (
      <div className={wrap} dir="rtl">
        <p className="p-4 text-center text-xl font-black text-[#4B2A6F]">{p.copy.hook}</p>
        <div className="relative mx-auto w-3/5 flex-1 overflow-hidden rounded-2xl">
          <Img src={img0} alt={p.productName} className="h-full w-full blur-[2px]" />
          <span className="absolute inset-0 flex items-center justify-center text-4xl">؟</span>
        </div>
        <div className="space-y-1 p-4 text-center">
          <p className="text-sm font-bold">{p.productName}</p><Cta label={p.copy.cta} />
        </div>
      </div>
    );
    case "arrival": return (
      <div className={wrap} dir="rtl">
        <p className="bg-[#d4af37] p-2 text-center text-sm font-black text-[#251836]">وصل حديثاً ✦</p>
        <div className="flex flex-1 items-center justify-center p-4"><Img src={img0} alt={p.productName} className="max-h-full w-3/5" /></div>
        <div className="space-y-1 p-4 text-center">
          <p className="text-base font-black">{p.copy.headline}</p>
          <Price p={p} /><Cta label={p.copy.cta} /><Trust level={p.trust} />
        </div>
      </div>
    );
    case "rank-led": return (
      <div className={wrap} dir="rtl">
        <div className="flex items-center justify-between p-3">
          <span className="rounded-full bg-[#4B2A6F] px-3 py-1 text-xs font-black text-white">#1 الأكثر طلباً</span>
          {p.rating != null && <span className="text-xs font-bold">★ {p.rating} ({p.reviewCount})</span>}
        </div>
        <div className="flex flex-1 items-center justify-center"><Img src={img0} alt={p.productName} className="max-h-full w-3/5" /></div>
        <div className="space-y-1 p-4 text-center">
          <p className="text-base font-black">{p.copy.headline}</p><Cta label={p.copy.cta} /><Trust level={p.trust} />
        </div>
      </div>
    );
    case "restraint-luxury": return (
      <div className={`${wrap} bg-[#251836] text-white`} dir="rtl">
        <p className="p-3 text-center text-[11px] tracking-widest text-[#F7D98C]">{p.brandAr}</p>
        <div className="flex flex-1 items-center justify-center p-6"><Img src={img0} alt={p.productName} className="max-h-full w-3/5" /></div>
        <div className="space-y-2 border-t border-[#d4af37]/30 p-4 text-center">
          <p className="text-sm">{p.copy.headline}</p><Cta label={p.copy.cta} dark />
        </div>
      </div>
    );
    case "three-act": return (
      <div className={wrap} dir="rtl">
        {["البداية: اكتشاف الحاجة", "الطقوس: الاستخدام اليومي", "النتيجة: روتين متكامل"].map((act, i) => (
          <div key={act} className={`flex flex-1 items-center gap-2 p-3 ${i % 2 ? "bg-white" : ""}`}>
            <span className="text-2xl font-black text-[#d4af37]">{i + 1}</span>
            <p className="text-xs font-bold">{i === 2 ? p.copy.headline : act}</p>
            {i === 2 && <Img src={img0} alt={p.productName} className="ms-auto h-16" />}
          </div>
        ))}
        <div className="p-3 text-center"><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "split-screen": return (
      <div className={wrap} dir="rtl">
        <div className="grid flex-1 grid-cols-2">
          <div className="flex flex-col items-center justify-center bg-[#4B2A6F] p-3 text-white">
            <p className="text-sm font-black">{p.concernLabel ?? p.copy.hook}</p>
            <p className="mt-1 text-[11px] opacity-80">{p.copy.subheadline}</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 bg-white p-3">
            <Img src={img0} alt={p.productName} className="h-32" />
            <Cta label={p.copy.cta} />
          </div>
        </div>
        <div className="p-2 text-center"><Trust level={p.trust} /></div>
      </div>
    );
    case "matcher": return (
      <div className={wrap} dir="rtl">
        <p className="p-3 text-center text-base font-black text-[#4B2A6F]">إذا كنتِ تعانين من {p.concernLabel ?? "هذه المشكلة"}...</p>
        <div className="mx-4 rounded-2xl bg-white p-3 text-center shadow-sm">
          <p className="text-xs">...فإن <b>{p.productName}</b> هو اختيارك</p>
          <p className="mt-1 text-[11px] text-[#6c6576]">{p.copy.subheadline}</p>
        </div>
        <div className="flex flex-1 items-end justify-center"><Img src={img0} alt={p.productName} className="h-36" /></div>
        <div className="p-3 text-center"><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "education-first": return (
      <div className={wrap} dir="rtl">
        <div className="bg-[#f4f1f7] p-3">
          <p className="text-sm font-black">{p.concernLabel ?? p.copy.headline}</p>
          <p className="mt-1 text-[11px] leading-relaxed">{p.copy.body ?? p.copy.subheadline}</p>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 p-3">
          <Img src={img0} alt={p.productName} className="h-32" />
          <div><p className="text-xs font-bold">{p.productName}</p><Cta label={p.copy.cta} /></div>
        </div>
      </div>
    );
    case "checklist-quiz": return (
      <div className={wrap} dir="rtl">
        <p className="p-3 text-center text-base font-black">{p.copy.hook}</p>
        <div className="mx-4 space-y-2">
          {(p.copy.checks && p.copy.checks.length > 0 ? p.copy.checks : p.copy.benefits.length > 0 ? p.copy.benefits : ["بشرتك تحتاج عناية يومية", "تبحثين عن حل بسيط", "تريدين نتيجة واضحة"]).map((c) => (
            <div key={c} className="flex items-center gap-2 rounded-xl bg-white p-2 text-xs shadow-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#4B2A6F] text-[10px]">✓</span>{c}
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-center gap-2 p-3">
          <Img src={img0} alt={p.productName} className="h-24" /><Cta label={p.copy.cta} />
        </div>
      </div>
    );
    case "temporal-primer": return (
      <div className={wrap} dir="rtl">
        <p className="bg-[#ede0f7] p-2 text-center text-xs font-bold">قبل {p.steps[0]?.titleAr ?? "روتينك"} — خطوة التحضير</p>
        <div className="flex flex-1 items-center justify-center p-4"><Img src={img0} alt={p.productName} className="max-h-full w-3/5" /></div>
        <div className="space-y-1 p-3 text-center">
          <p className="text-sm font-black">{p.copy.headline}</p>
          <p className="text-[11px] text-[#6c6576]">ثم انتقلي لخطوتك التالية ←</p>
          <Cta label={p.copy.cta} />
        </div>
      </div>
    );
    case "builder-grid": return (
      <div className={wrap} dir="rtl">
        <p className="p-3 text-center text-base font-black">{p.copy.headline}</p>
        <div className="grid flex-1 grid-cols-2 gap-2 px-4">
          {p.images.slice(0, 4).map((src, i) => (
            <div key={i} className="relative rounded-2xl bg-white p-2 shadow-sm">
              <span className="absolute start-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#4B2A6F] text-xs font-black text-white">{i + 1}</span>
              <Img src={src} alt={`${p.productName} ${i + 1}`} className="h-24 w-full" />
            </div>
          ))}
        </div>
        <div className="p-3 text-center"><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "timeline-am": return (
      <div className={`${wrap} bg-gradient-to-b from-[#fbf6e6] to-[#FFF7F2]`} dir="rtl">
        <p className="p-3 text-center">☀️ <b>{p.copy.headline}</b></p>
        <div className="flex-1 space-y-2 px-4">
          {p.images.slice(0, 4).map((src, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-white/80 p-2 shadow-sm">
              <span className="text-xs font-black text-[#d4af37]">{["صباحاً", "ثم", "ثم", "أخيراً"][i] ?? "ثم"}</span>
              <Img src={src} alt="" className="h-12" />
              <span className="text-[11px] font-bold">{p.steps[i]?.titleAr ?? `خطوة ${i + 1}`}</span>
            </div>
          ))}
        </div>
        <div className="p-3 text-center"><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "timeline-pm": return (
      <div className={`${wrap} bg-[#251836] text-white`} dir="rtl">
        <p className="p-3 text-center">🌙 <b>{p.copy.headline}</b></p>
        <div className="flex-1 space-y-2 px-4">
          {p.images.slice(0, 4).map((src, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-white/10 p-2">
              <span className="text-xs font-black text-[#F7D98C]">{["مساءً", "ثم", "ثم", "أخيراً"][i] ?? "ثم"}</span>
              <Img src={src} alt="" className="h-12 rounded-lg bg-white/90" />
              <span className="text-[11px] font-bold">{p.steps[i]?.titleAr ?? `خطوة ${i + 1}`}</span>
            </div>
          ))}
        </div>
        <div className="p-3 text-center"><Cta label={p.copy.cta} dark /></div>
      </div>
    );
    case "triptych": return (
      <div className={wrap} dir="rtl">
        <p className="p-3 text-center text-base font-black">{p.copy.headline}</p>
        <div className="grid flex-1 grid-cols-3 gap-1 px-3">
          {p.images.slice(0, 3).map((src, i) => (
            <div key={i} className="flex flex-col items-center rounded-2xl bg-white p-2 shadow-sm">
              <span className="text-3xl font-black text-[#d4af37]">{i + 1}</span>
              <Img src={src} alt="" className="h-20" />
              <span className="mt-1 text-[10px] font-bold">{p.steps[i]?.titleAr ?? ""}</span>
            </div>
          ))}
        </div>
        <div className="p-3 text-center"><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "cluster": return (
      <div className={wrap} dir="rtl">
        <p className="p-3 text-center text-base font-black">{p.copy.headline}</p>
        <div className="flex flex-1 flex-wrap items-center justify-center gap-2 px-4">
          {p.images.slice(0, 6).map((src, i) => (
            <Img key={i} src={src} alt="" className="h-20 rounded-xl bg-white p-1 shadow-sm" />
          ))}
        </div>
        <div className="space-y-1 p-3 text-center"><Price p={p} /><Cta label={p.copy.cta} /><Trust level={p.trust} /></div>
      </div>
    );
    case "journey-nodes": return (
      <div className={wrap} dir="rtl">
        <p className="p-3 text-center text-base font-black">{p.copy.headline}</p>
        <div className="flex flex-1 items-start justify-center gap-1 px-3">
          {["الأسبوع 1", "الأسبوع 2", "الأسبوع 3", "الأسبوع 4"].map((w, i) => (
            <div key={w} className="flex flex-1 flex-col items-center">
              <span className={`h-4 w-4 rounded-full ${i === 0 ? "bg-[#4B2A6F]" : "bg-[#d9c2ed]"}`} />
              <span className="mt-1 text-[10px] font-bold">{w}</span>
              {p.images[i] && <Img src={p.images[i]} alt="" className="mt-1 h-14 rounded-lg bg-white p-1 shadow-sm" />}
            </div>
          ))}
        </div>
        <div className="p-3 text-center"><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "wall-grid": return (
      <div className={wrap} dir="rtl">
        <div className="bg-[#4B2A6F] p-3 text-center text-white">
          <p className="text-sm font-black">{p.brandAr || p.copy.headline}</p>
          <p className="text-[11px] opacity-80">التشكيلة الكاملة</p>
        </div>
        <div className="grid flex-1 grid-cols-4 gap-1.5 p-3">
          {p.images.slice(0, 8).map((src, i) => (
            <div key={i} className="rounded-xl bg-white p-1 shadow-sm"><Img src={src} alt="" className="h-16 w-full" /></div>
          ))}
        </div>
        <div className="p-3 text-center"><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "price-first": return (
      <div className={wrap} dir="rtl">
        <div className="bg-[#d4af37] p-3 text-center">
          <p className="text-4xl font-black text-[#251836]">{p.offerLabel ?? p.copy.headline}</p>
        </div>
        <div className="flex flex-1 items-center justify-center p-3"><Img src={img0} alt={p.productName} className="max-h-full w-3/5" /></div>
        <div className="space-y-1 p-3 text-center"><Price p={p} /><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "bundle-anatomy": return (
      <div className={wrap} dir="rtl">
        <p className="p-3 text-center text-base font-black">{p.copy.headline}</p>
        <div className="mx-4 flex-1 rounded-2xl border-2 border-dashed border-[#d4af37] p-3">
          <div className="flex flex-wrap justify-center gap-2">
            {p.images.map((src, i) => (
              <div key={i} className="rounded-xl bg-white p-1 shadow-sm"><Img src={src} alt="" className="h-16" /></div>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-[#6c6576]">داخل الباقة: {p.images.length} قطع مختارة</p>
        </div>
        <div className="space-y-1 p-3 text-center"><Price p={p} /><Cta label={p.copy.cta} /><Trust level={p.trust} /></div>
      </div>
    );
    case "receipt": return (
      <div className={wrap} dir="rtl">
        <p className="p-3 text-center text-base font-black">{p.copy.headline}</p>
        <div className="mx-6 flex-1 rounded-xl bg-white p-3 font-mono shadow-sm">
          {p.images.slice(0, 4).map((src, i) => (
            <div key={i} className="flex items-center justify-between border-b border-dashed border-[#e8e4ee] py-1.5 text-[11px]">
              <span>قطعة {i + 1}</span><Img src={src} alt="" className="h-8" />
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 text-xs font-black text-[#4B2A6F]">
            <span>الإجمالي أوفر</span><Cta label={p.copy.cta} />
          </div>
        </div>
        <div className="p-2" />
      </div>
    );
    case "occasion-tags": return (
      <div className={wrap} dir="rtl">
        <div className="relative flex-1">
          <Img src={img0} alt={p.productName} className="h-full w-full object-cover" />
          {p.images.slice(1, 4).map((src, i) => (
            <span key={i} className={`absolute rounded-full bg-[#d4af37] px-2 py-1 text-[10px] font-black text-[#251836] ${i === 0 ? "end-3 top-3" : i === 1 ? "start-3 top-1/3" : "end-3 bottom-3"}`}>+ قطعة {i + 2}</span>
          ))}
        </div>
        <div className="space-y-1 p-3 text-center">
          <p className="text-sm font-black">{p.copy.headline}</p><Cta label={p.copy.cta} />
        </div>
      </div>
    );
    case "deadline-led": return (
      <div className={wrap} dir="rtl">
        <div className="bg-[#ef4444] p-2 text-center text-sm font-black text-white">⏳ {p.deadlineLabel ?? "لفترة محدودة"}</div>
        <div className="flex flex-1 items-center justify-center p-4"><Img src={img0} alt={p.productName} className="max-h-full w-3/5" /></div>
        <div className="space-y-1 p-3 text-center">
          <p className="text-sm font-black">{p.copy.headline}</p><Price p={p} /><Cta label={p.copy.cta} />
        </div>
      </div>
    );
    case "dual-promise": return (
      <div className={wrap} dir="rtl">
        <div className="grid flex-1 grid-rows-2">
          <div className="flex flex-col items-center justify-center bg-[#d4af37]/20 p-3">
            <p className="text-lg font-black text-[#4B2A6F]">{p.offerLabel ?? p.copy.headline}</p>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white p-3">
            <Img src={img0} alt={p.productName} className="h-28" />
            <ul className="space-y-1 text-[11px] font-bold">
              {p.copy.benefits.slice(0, 2).map((b) => <li key={b}>✓ {b}</li>)}
            </ul>
          </div>
        </div>
        <div className="p-3 text-center"><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "story-flash": return (
      <div className={wrap} dir="rtl">
        <p className="bg-[#4B2A6F] p-2 text-center text-sm font-black text-[#F7D98C]">⚡ عرض خاطف ⚡</p>
        <div className="flex flex-1 items-center justify-center p-4"><Img src={img0} alt={p.productName} className="max-h-full w-4/5" /></div>
        <div className="space-y-1 p-4 text-center">
          <p className="text-base font-black">{p.copy.headline}</p><Price p={p} />
          <span className="inline-block rounded-full bg-[#4B2A6F] px-8 py-2 text-sm font-bold text-white">اسحبي للأعلى ↑</span>
        </div>
      </div>
    );
    case "tip-first": return (
      <div className={wrap} dir="rtl">
        <div className="m-3 rounded-2xl bg-[#4B2A6F] p-3 text-white">
          <p className="text-[11px] opacity-80">💡 نصيحة اليوم</p>
          <p className="mt-1 text-sm font-black">{p.copy.body ?? p.copy.subheadline}</p>
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 px-3">
          <Img src={img0} alt={p.productName} className="h-32" />
          <p className="text-[11px] font-bold">{p.productName}</p>
        </div>
        <div className="p-3 text-center"><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "decision-tree": return (
      <div className={wrap} dir="rtl">
        <p className="p-3 text-center text-base font-black">{p.copy.headline}</p>
        <div className="flex-1 space-y-2 px-4 text-center">
          {(p.copy.branches && p.copy.branches.length > 0 ? p.copy.branches : [{ label: "بشرة دهنية؟", target: p.productName }, { label: "بشرة جافة؟", target: `رطبي أولاً ثم ${p.productName}` }, { label: "غير متأكدة؟", target: "ابدئي بالتجربة المصغرة" }]).map((b, i, arr) => (
            <div key={b.label}>
              <div className={`rounded-xl p-2 text-[11px] shadow-sm ${i === arr.length - 1 ? "bg-[#4B2A6F] font-bold text-white" : "bg-white"}`}>{b.label} ← <b>{b.target}</b></div>
              {i < arr.length - 1 && <div className="mx-auto h-4 w-0.5 bg-[#d9c2ed]" />}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 p-3"><Img src={img0} alt={p.productName} className="h-16" /><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "versus-columns": return (
      <div className={wrap} dir="rtl">
        <p className="p-3 text-center text-base font-black">{p.copy.headline}</p>
        <div className="grid flex-1 grid-cols-2 gap-2 px-3">
          {p.images.slice(0, 2).map((src, i) => (
            <div key={i} className={`flex flex-col items-center rounded-2xl p-2 ${i === 0 ? "bg-[#4B2A6F] text-white" : "bg-white shadow-sm"}`}>
              <Img src={src} alt="" className="h-24" />
              <p className="mt-1 text-[10px] font-bold">{i === 0 ? "اختيارنا" : "البديل"}</p>
            </div>
          ))}
        </div>
        <div className="p-3 text-center">
          <p className="mb-1 text-[11px] text-[#6c6576]">الخلاصة: {p.copy.subheadline}</p>
          <Cta label={p.copy.cta} />
        </div>
      </div>
    );
    case "science-first": return (
      <div className={wrap} dir="rtl">
        <div className="bg-[#f4f1f7] p-3 text-center">
          <p className="text-[11px] text-[#6c6576]">المكون الفعال</p>
          <p className="text-2xl font-black text-[#4B2A6F]">{p.ingredient ?? p.copy.headline}</p>
        </div>
        <p className="px-3 py-1 text-center text-[11px]">{p.copy.body ?? p.copy.subheadline}</p>
        <div className="flex flex-1 items-center justify-center"><Img src={img0} alt={p.productName} className="max-h-full w-1/2" /></div>
        <div className="p-3 text-center"><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "qa-blocks": return (
      <div className={wrap} dir="rtl">
        <p className="p-3 text-center text-base font-black">{p.copy.headline}</p>
        <div className="flex-1 space-y-2 px-4">
          {(p.copy.faqs && p.copy.faqs.length > 0 ? p.copy.faqs : [{ q: "هل يناسب بشرتي؟", a: p.copy.subheadline }, { q: "كيف أستخدمه؟", a: p.copy.body ?? p.copy.subheadline }, { q: "ما فوائده؟", a: p.copy.subheadline }]).map((f) => (
            <div key={f.q} className="rounded-xl bg-white p-2 shadow-sm">
              <p className="text-[11px] font-black text-[#4B2A6F]">س: {f.q}</p>
              <p className="mt-0.5 text-[11px]">ج: {f.a}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 p-3"><Img src={img0} alt={p.productName} className="h-14" /><Cta label={p.copy.cta} /></div>
      </div>
    );
    case "editorial-quote": return (
      <div className={`${wrap} items-center justify-center bg-[#4B2A6F] p-6 text-center text-white`} dir="rtl">
        <p className="text-5xl text-[#d4af37]">”</p>
        <p className="text-xl font-black leading-relaxed">{p.quote ?? p.copy.headline}</p>
        <Img src={img0} alt={p.productName} className="my-3 h-28 opacity-90" />
        <Logo small />
      </div>
    );
    case "ugc-frame": return (
      <div className={wrap} dir="rtl">
        <div className="m-3 rounded-2xl bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ede0f7] text-sm">👩</span>
            <div><p className="text-[11px] font-black">عميلة موثقة ✓</p>
            {p.rating != null && <p className="text-[10px] text-[#d4af37]">{"★".repeat(Math.round(p.rating))}</p>}</div>
          </div>
          <p className="mt-2 text-xs leading-relaxed">“{p.reviewSnippet ?? p.copy.subheadline}”</p>
        </div>
        <div className="flex flex-1 items-center justify-center"><Img src={img0} alt={p.productName} className="max-h-full w-1/2" /></div>
        <div className="space-y-1 p-3 text-center"><Cta label={p.copy.cta} /><Trust level={p.trust} /></div>
      </div>
    );
    case "freeform": {
      // Path B: executes the AI-authored spec. No fixed structures here —
      // the idea AND the layout both come from the model (validated upstream).
      if (!p.freeform?.spec) {
        return (
          <div className={wrap} dir="rtl">
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[#6c6576]">
              هذا المفهوم بلا مواصفات معتمدة — أعد توليد المفهوم الحر.
            </div>
          </div>
        );
      }
      return <SpecCanvas spec={p.freeform.spec} p={p} />;
    }
    case "house-signature":
    default: return (
      <div className={wrap} dir="rtl">
        <div className="flex items-center justify-center gap-2 border-b-2 border-[#d4af37] bg-white p-2">
          <Logo />
        </div>
        <p className="p-2 text-center text-[11px] tracking-widest text-[#7A3E9D]">توقيع لومينوس ✦ الجمال بعناية</p>
        <div className="flex flex-1 items-center justify-center p-3"><Img src={img0} alt={p.productName} className="max-h-full w-3/5" /></div>
        <div className="space-y-1 bg-[#4B2A6F] p-3 text-center text-white">
          <p className="text-sm font-black">{p.copy.headline}</p>
          <Cta label={p.copy.cta} dark />
        </div>
      </div>
    );
  }
}
