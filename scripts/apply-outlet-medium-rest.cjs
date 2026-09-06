/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Medium Batch 3 — remaining reviewed Medium products (17 accepted / 35 rejected).
 * Outlet Pharmacy text used verbatim/near-verbatim per corrected rule.
 * Only description.ar changes; benefits.ar only when outlet benefits exist.
 * Surgical patching + full protected-field verification.
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

/* ── authored content: outlet text verbatim-cleaned ────── */
const CONTENT = {
  "yq-1240": {
    desc: "سنسوداين معجون بالفلورايد 75مل يوفر حماية فعالة لأسنانك من التسوس ويخفف حساسية الأسنان.",
    benefits: "يساعد الفلورايد في تقوية مينا الأسنان مما يقلل من خطر التسوس، ويوفر راحة لمن يعانون من حساسية تجاه الأطعمة والمشروبات الساخنة أو الباردة. كما يسهم في إزالة البكتيريا واللويحات السنية للحفاظ على صحة الفم، مع طعم منعش يجعل تجربة تنظيف الأسنان يوميًا أكثر متعة.",
  },
  "yq-1473": {
    desc: "كولجيت معجون اوبتيك وايت فوري 75مل يوفر تبييض فوري للأسنان ويعزز صحة الفم، لابتسامة مشرقة وثقة في كل استخدام.",
    benefits: "يعمل على إزالة البقع السطحية بسرعة ليمنح ابتسامة مشرقة في دقائق، ويساهم في تقوية مينا الأسنان وحمايتها من التسوس بفضل تركيبته الفعالة. كما يمنح شعورًا بالانتعاش والنظافة لفترة طويلة بعد الاستخدام، وهو مناسب للاستخدام اليومي كجزء أساسي من روتين العناية بالفم.",
  },
  "yq-759": {
    desc: "بيزلين غسول نسائي للبشرة الحساسة جدا 200مل، ينظف بلطف ويرطب البشرة الحساسة، مثالي للاستخدام اليومي.",
    benefits: "ينظف البشرة بلطف دون التسبب في تهيجها، ويساعد في الحفاظ على رطوبتها ومنع جفافها. تركيبة خاصة تناسب جميع أنواع البشرة الحساسة، بمكونات طبيعية وآمنة للاستخدام اليومي.",
  },
  "yq-241": {
    desc: "اولاي كريم مفتح ليلي 50 مل يساعد في تفتيح البشرة وترطيبها أثناء النوم للحصول على إشراقة طبيعية.",
    benefits: "يساعد على تقليل ظهور البقع الداكنة وتوحيد لون البشرة، ويوفر ترطيبًا فعالًا يدوم طوال الليل محافظًا على نعومتها. كما يعزز من عملية تجديد خلايا البشرة لمظهر أكثر شبابًا، ويمكن استخدامه بأمان على جميع أنواع البشرة بما فيها الحساسة.",
  },
  "yq-2354": {
    desc: "بالمرز كريم مساج بزبدة الكاكاو لعلامات تمدد الجلد 125 جم يوفر ترطيب عميق للبشرة الجافة ويحسن مظهرها بفضل مكوناته الطبيعية.",
    benefits: "يمنح الكريم ترطيبًا مكثفًا يدوم طويلاً يجعل البشرة تبدو صحية ومشرقة، ويساعد في تقليل مظهر الخطوط الدقيقة والتجاعيد لبشرة أكثر شبابًا. زبدة الكاكاو تغذي البشرة وتساعد في الحفاظ على رطوبتها، ويمكن استخدامه يوميًا ضمن روتين العناية بالبشرة للحصول على أفضل النتائج.",
  },
  "yq-1267": {
    desc: "فيم فريش بودره نسائية 200جرام للحفاظ على الانتعاش والثقة، توفر حماية فعالة من الروائح وتساعد على امتصاص الرطوبة.",
    benefits: "توفر حماية طويلة الأمد من الروائح الكريهة لتشعري بالثقة طوال اليوم، بتركيبة سهلة الاستخدام تمنح انتعاشًا وراحة في المناطق الحساسة. تساعد على التحكم في الرطوبة وتقليل الانزعاج الناتج عن العرق، بمكونات طبيعية آمنة تجعلها مناسبة للاستخدام اليومي.",
  },
  "yq-920": {
    desc: "بيجمانورم كريم 30 جرام يحتوي على هيدروكينون وهيدروكورتيزون وتريتينوين لعلاج تصبغات الجلد. يُطبق على المنطقة المصابة مرتين يوميًا صباحًا ومساءً، بعد تنظيف المنطقة وتجفيفها جيدًا. يُفضل استخدامه تحت إشراف طبيب مختص.",
    benefits: null,
  },
  "yq-1529": {
    desc: "لابيلو مرطب شفاه بعطر البطيخ 4.8جم يوفر ترطيباً عميقاً ورائحة منعشة، يحمي الشفاه من الجفاف والتشقق.",
    benefits: "يحتوي على مكونات فعالة تعمل على ترطيب الشفاه ومنع جفافها، مع عبير البطيخ المنعش الذي يضيف لمسة من الحيوية. يساعد في الحفاظ على نعومة الشفاه وحمايتها من العوامل الخارجية، ويرافقك في أي وقت بتصميمه المريح سهل الحمل.",
  },
  "yq-345": {
    desc: "افالون الفا بلس كريم 30 جرام لتحسين مظهر البشرة وترطيبها وتوحيد لونها، مناسب لجميع أنواع البشرة.",
    benefits: "يساعد الكريم في تقليل ظهور البقع الداكنة والتصبغات، مع ترطيب فعّال يمنح البشرة مظهرًا صحيًا. يعمل على تفتيح لون البشرة وتوحيد تدريجي، ويمكن استخدامه بأمان على جميع أنواع البشرة بما فيها الحساسة.",
  },
  "yq-1817": {
    desc: "دوف باودر سوفت مزيل عرق ستيك 40جم يوفر حماية فعالة وانتعاش يدوم طويلاً مع تركيبة لطيفة على البشرة.",
    benefits: "يوفر حماية فعالة ضد التعرق لمدة تصل إلى 48 ساعة، بتركيبة تحتوي على مكونات مرطبة تمنع التهيج وتحافظ على نعومة البشرة. يأتي بشكل ستيك سهل التطبيق، ورائحته المنعشة تدوم طوال اليوم منحيًا إياك شعور الانتعاش والثقة.",
  },
  "yq-899": {
    desc: "لوريال ماجيك ريتاتش صبغة سبراي لإخفاء لون جذور الشعر بني، بخاخ فوري يمنح لونًا طبيعيًا متجانسًا في ثوانٍ.",
    benefits: "يوفر لونًا غنيًا يغطي الشعر الرمادي بسرعة وسهولة، بتركيبة خفيفة لا تترك آثارًا دهنية أو تكتلات على الشعر. تصميمه العملي يمكّنك من استخدامه في أي وقت وفي أي مكان، ويُرش على الشعر الجاف من مسافة 15 سم ثم يوزع بالتساوي حتى الوصول إلى اللون المرغوب.",
  },
  "yq-197": {
    desc: "اولاي كريم مفتح نهاري بحماية من أشعة الشمس، يمنح بشرتك إشراقة طبيعية ويقلل من البقع الداكنة طوال النهار.",
    benefits: "يساعد على توحيد لون البشرة وتقليل البقع الداكنة، مع ترطيب فعّال يدوم ويحافظ على نعومة الوجه. يحتوي على مكونات تحمي البشرة من الأضرار الناتجة عن الشمس والتلوث، وتمتاز تركيبته بالخفة وسهولة الامتصاص ما يجعله مثاليًا للاستخدام الصباحي قبل المكياج.",
  },
  "yq-1814": {
    desc: "دوف مزيل عرق انفيسيبل ستيك 40جم يوفر حماية فعالة ضد التعرق والروائح لمدة 48 ساعة، مناسب لجميع أنواع البشرة.",
    benefits: "حماية تدوم حتى 48 ساعة ضد التعرق، بتركيبة لطيفة لا تسبب تهيجًا للبشرة الحساسة. رائحته المنعشة تمنحك شعور الانتعاش والثقة طوال اليوم، وشكل الستيك يجعل تطبيقه سريعًا وسهلًا على البشرة الجافة بعد الاستحمام.",
  },
  "yq-660": {
    desc: "لابيلو مرطب شفاه بالكرز 4.8جم يوفر ترطيباً عميقاً ونعومة تدوم، مثالي للاستخدام اليومي لحماية الشفاه من الجفاف.",
    benefits: "مكوناته الفعالة ترطب الشفاه وتحميها من الجفاف، مع عطر الكرز اللطيف الذي يضيف لمسة انتعاش مميزة. يأتي بتصميم مريح يسهل حمله واستخدامه في أي وقت، ويناسب جميع أنواع الشفاه حتى الحساسة منها.",
  },
  "yq-535": {
    desc: "بيبانثين كريم 30 جرام يحتوي على دكسابانثينول وكلورهكسيدين لعلاج الجروح وترطيب البشرة. يُستخدم مرتين إلى ثلاث مرات يوميًا على المنطقة المصابة بعد تنظيفها جيدًا، مع تدليك كمية مناسبة بلطف حتى امتصاصها الكامل.",
    benefits: null,
  },
  "yq-2561": {
    desc: "جيليت فينوس سموث ماكينة حلاقة نسائية للبشرة الحساسة تأتي مع شفرتين إضافيتين لحلاقة ناعمة وسهلة.",
    benefits: "توفر شفرات فينوس حلاقة دقيقة وناعمة دون تهيج البشرة، بتصميم يتناسب مع منحنيات الجسم ليسهل التحكم أثناء الحلاقة. الشفرتان الإضافيتان تضمنان استمرارية الاستخدام لفترة أطول، وتقنيتها المتطورة تساعد على تقليل التهيج والحفاظ على نعومة البشرة بعد كل حلاقة. تُستخدم على بشرة رطبة مع جل الحلاقة للحصول على أفضل النتائج.",
  },
  "yq-1987": {
    desc: "كيوفي لوشن مرطب للبشرة 250مل يوفر ترطيبًا عميقًا لجميع أنواع البشرة، مع مكونات طبيعية لتحسين صحة البشرة.",
    benefits: "يوفر ترطيبًا مكثفًا يساعد على منع الجفاف ويعزز مرونة البشرة، وخيار مثالي حتى للبشرة الحساسة. تركيبته الخفيفة تتشرب بسرعة دون أي أثر دهني ما يجعله مناسبًا للاستخدام اليومي بعد الاستحمام أو عند الحاجة، بمكونات فعالة تسهم في تحسين صحة البشرة بشكل عام.",
  },
};

/* ── staged records ───────────────────────────────────── */
const staged = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/content/outlet-matching/medium-confidence-matches.json"), "utf8")
);
const eligible = staged.matches.filter((m) => !m.previously_applied && CONTENT[m.luminous_id]);
const rejectedInReview = staged.matches.filter((m) => !m.previously_applied && !CONTENT[m.luminous_id]);
console.log("eligible:", eligible.length, "| rejected in review:", rejectedInReview.length);

/* ── load parts ───────────────────────────────────────── */
function loadPartRaw(i) {
  const f = path.join(ROOT, `src/data/products-part-0${i}.ts`);
  const src = fs.readFileSync(f, "utf8");
  return { file: `src/data/products-part-0${i}.ts`, src };
}
const pristineParts = [];
for (let i = 1; i <= 8; i++) pristineParts.push(loadPartRaw(i));
function parseArr(src) {
  return JSON.parse(src.slice(src.indexOf("["), src.lastIndexOf("]") + 1));
}
const pristineCatalog = [];
for (const p of pristineParts) pristineCatalog.push(...parseArr(p.src));
const TOTAL_BEFORE = pristineCatalog.length;
const pristineById = new Map(pristineCatalog.map((p) => [p.id, JSON.parse(JSON.stringify(p))]));
const appliedIds = new Set(Object.keys(CONTENT));

/* ── surgical helpers ─────────────────────────────────── */
function findStringEnd(src, openQuoteIdx) {
  let i = openQuoteIdx + 1;
  while (i < src.length) {
    if (src[i] === "\\") { i += 2; continue; }
    if (src[i] === '"') return i;
    i++;
  }
  return -1;
}
function scanStr(src, q) { return findStringEnd(src, q); }

function findProductRange(src, pid) {
  const anchor = '"id":"' + pid + '"';
  let from = 0;
  while (true) {
    const a = src.indexOf(anchor, from);
    if (a < 0) return null;
    const s = src.lastIndexOf("{", a);
    if (s < 0) return null;
    let depth = 0, j = s;
    for (; j < src.length; j++) {
      const ch = src[j];
      if (ch === '"') { j = scanStr(src, j); continue; }
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) break; }
    }
    if (j >= src.length) { from = a + 1; continue; }
    const txt = src.slice(s, j + 1);
    const goodPrefix = txt.startsWith('{"id":"' + pid + '"');
    const charBefore = s > 0 ? src[s - 1] : "[";
    const charAfter = j + 1 < src.length ? src[j + 1] : "]";
    const goodBounds = [",", "["].includes(charBefore) && [",", "]"].includes(charAfter);
    if (!goodPrefix || !goodBounds) { from = a + 1; continue; }
    return [s, j];
  }
}

function patchDescription(objText, newDescJson) {
  const descKey = objText.indexOf('"description":{');
  const arKeyD = objText.indexOf('"ar":', descKey);
  const qOpenD = objText.indexOf('"', arKeyD + 5);
  const qCloseD = scanStr(objText, qOpenD);
  return objText.slice(0, qOpenD) + newDescJson + objText.slice(qCloseD + 1);
}

function patchBenefitsAr(objText, newArrJson) {
  const benKey = objText.indexOf('"benefits":{');
  const arrMarker = objText.indexOf('"ar":[', benKey);
  const arrOpen = arrMarker + 5;
  let depth = 0, arrClose = -1;
  for (let k = arrOpen; k < objText.length; k++) {
    const ch = objText[k];
    if (ch === '"') { k = scanStr(objText, k); continue; }
    if (ch === "[") depth++;
    else if (ch === "]") { depth--; if (depth === 0) { arrClose = k; break; } }
  }
  return objText.slice(0, arrOpen) + "[" + JSON.stringify(newArrJson[0]) + "]" + objText.slice(arrClose + 1);
}

/* ── apply ────────────────────────────────────────────── */
const audit = [];
let applied = 0;

for (const rec of eligible) {
  const before = pristineById.get(rec.luminous_id);
  const c = CONTENT[rec.luminous_id];

  const tok = (s) =>
    String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 3);
  let overlap = 0;
  if (c.benefits) {
    const dSet = new Set(tok(c.desc));
    const bToks = tok(c.benefits);
    let inter = 0;
    for (const t of bToks) if (dSet.has(t)) inter++;
    overlap = inter / Math.max(1, Math.min(dSet.size, bToks.length));
  }

  audit.push({
    luminous_id: rec.luminous_id,
    luminous_name_ar: before?.name?.ar,
    outlet_match: { nameAr: rec.outlet_nameAr, url: rec.outlet_url },
    confidence: "medium",
    signals_verified: rec.signals,
    verified_facts_source: "outlet-pharmacy-scraped-content",
    fields_changed: c.benefits ? ["description.ar", "benefits.ar"] : ["description.ar"],
    old_content: {
      description_ar: before?.description?.ar ?? "",
      benefits_ar: Array.isArray(before?.benefits?.ar) ? before.benefits.ar : [],
    },
    new_content: {
      description_ar: c.desc,
      benefits_ar: c.benefits ? [c.benefits] : "(unchanged — no outlet benefits available)",
    },
    validation: {
      status: overlap > 0.55 ? "flagged-duplication" : "pass",
      desc_benefits_token_overlap: Math.round(overlap * 100) / 100,
      protected_fields_untouched: true,
    },
  });
  applied++;
}

for (let i = 1; i <= 8; i++) {
  const filePath = path.join(ROOT, `src/data/products-part-0${i}.ts`);
  let src = fs.readFileSync(filePath, "utf8");
  let changedHere = 0;
  for (const rec of eligible) {
    const pid = rec.luminous_id;
    const range = findProductRange(src, pid);
    if (!range) continue;
    const [s, e] = range;
    let objText = src.slice(s, e + 1);
    JSON.parse(objText);
    const c = CONTENT[pid];
    objText = patchDescription(objText, JSON.stringify(c.desc));
    if (c.benefits) objText = patchBenefitsAr(objText, [c.benefits]);
    src = src.slice(0, s) + objText + src.slice(e + 1);
    changedHere++;
  }
  if (changedHere > 0) {
    fs.writeFileSync(filePath, src, "utf8");
    console.log("wrote part-" + i + "->", changedHere, "products");
  }
}

/* ── verification ─────────────────────────────────────── */
const allowedTopKeys = new Set(["description", "benefits"]);
const violations = [];
const reloaded = [];
for (let i = 1; i <= 8; i++) {
  const r = loadPartRaw(i);
  reloaded.push(...parseArr(r.src));
}
if (reloaded.length !== TOTAL_BEFORE) violations.push("TOTAL COUNT CHANGED: " + reloaded.length);

const newById = new Map(reloaded.map((p) => [p.id, p]));
for (const [id, beforeObj] of pristineById) {
  const after = newById.get(id);
  if (!after) { violations.push(id + ": MISSING"); continue; }
  for (const key of Object.keys(beforeObj)) {
    const bVal = JSON.stringify(beforeObj[key]);
    const aVal = JSON.stringify(after[key]);
    if (bVal === aVal) continue;
    if (!allowedTopKeys.has(key)) { violations.push(id + ": PROTECTED FIELD CHANGED -> " + key); continue; }
    if (key === "description" && JSON.stringify(beforeObj.description.en) !== JSON.stringify(after.description.en)) {
      violations.push(id + ": description.en changed");
    }
    if (key === "benefits" && JSON.stringify(beforeObj.benefits.en) !== JSON.stringify(after.benefits.en)) {
      violations.push(id + ": benefits.en changed");
    }
  }
}
const expectedChanged = new Set(eligible.map((r) => r.luminous_id));
for (const id of pristineById.keys()) {
  if (expectedChanged.has(id)) continue;
  if (JSON.stringify(pristineById.get(id)) !== JSON.stringify(newById.get(id))) {
    violations.push(id + ": UNEXPECTEDLY MODIFIED");
  }
}
console.log("VERIFICATION:", violations.length === 0 ? "PASS" : "FAIL");
violations.forEach((v) => console.log(" !!", v));
if (violations.length > 0) process.exit(1);

/* ── audit file ───────────────────────────────────────── */
fs.writeFileSync(
  path.join(ROOT, "src/data/content/outlet-matching/application-audit-batch3-medium-rest.json"),
  JSON.stringify({
    runAt: new Date().toISOString(),
    scope: "remaining medium-confidence products (final manual review)",
    applied,
    rejected_after_review: rejectedInReview.map((r) => ({
      luminous_id: r.luminous_id,
      luminous_name_ar: r.luminous_name_ar,
      reason: "variant-size-format-conflict-or-source-contamination",
    })),
    notes: [
      "outlet text used verbatim/near-verbatim per corrected rule",
      "yq-920 & yq-535: benefits untouched (no outlet benefits available; usage folded into description)",
    ],
    records: audit,
  }, null, 2),
  "utf8"
);
console.log("APPLIED:", applied);
audit.forEach((a) =>
  console.log(` • ${a.luminous_id} ${a.validation.status} (overlap=${a.validation.desc_benefits_token_overlap})`)
);
