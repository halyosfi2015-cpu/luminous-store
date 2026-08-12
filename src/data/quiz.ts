import type { SkinType, SkinConcern } from "@/src/types/product";

export type QuizOptionWeight = {
  skinTypes?: Partial<Record<SkinType, number>>;
  concerns?: Partial<Record<SkinConcern, number>>;
};

export type QuizOption = {
  id: string;
  label: { ar: string; en: string };
  weight: QuizOptionWeight;
};

export type QuizQuestion = {
  id: string;
  question: { ar: string; en: string };
  hint?: { ar: string; en: string };
  multi?: boolean;
  options: QuizOption[];
};

export type QuizResult = {
  skinTypes: SkinType[];
  skinConcerns: SkinConcern[];
};

export const skinTypeLabels: Record<SkinType, { ar: string; en: string }> = {
  dry: { ar: "بشرة جافة", en: "Dry skin" },
  oily: { ar: "بشرة دهنية", en: "Oily skin" },
  combination: { ar: "بشرة مختلطة", en: "Combination skin" },
  sensitive: { ar: "بشرة حساسة", en: "Sensitive skin" },
  normal: { ar: "بشرة عادية", en: "Normal skin" },
  all: { ar: "جميع أنواع البشرة", en: "All skin types" },
};

export const skinConcernLabels: Record<SkinConcern, { ar: string; en: string }> = {
  acne: { ar: "حب الشباب", en: "Acne" },
  dryness: { ar: "الجفاف", en: "Dryness" },
  pigmentation: { ar: "التصبغات والبقع الداكنة", en: "Pigmentation" },
  aging: { ar: "علامات التقدم في السن", en: "Aging" },
  redness: { ar: "الاحمرار والتهيج", en: "Redness" },
  large_pores: { ar: "المسام الواسعة", en: "Large pores" },
  uneven_texture: { ar: "ملمس غير متجانس", en: "Uneven texture" },
  dark_circles: { ar: "الهالات السوداء", en: "Dark circles" },
  oiliness: { ar: "اللمعان الزائد", en: "Oiliness" },
  sensitivity: { ar: "الحساسية", en: "Sensitivity" },
};

/* ========================================================================
   الأسئلة المحدثة - مستندة إلى معايير بيولوجية معروفة (Fitzpatrick, Baumann, 
   معايير الأكاديمية الأمريكية للأمراض الجلدية AAD، وورقة عمل Glogau للشيخوخة)
   ======================================================================== */
export const quizQuestions: QuizQuestion[] = [
  // Q1: Barrier Function / Sebum Production (تصنيف Baumann للنوع الدهني/الجاف)
  {
    id: "barrier",
    question: {
      ar: "بعد غسل وجهك بمنظف لطيف وتجفيفه، كيف يبدو ملمس بشرتك بعد 15 دقيقة دون وضع أي منتج؟",
      en: "How does your skin feel 15 minutes after gentle cleansing, without applying any product?"
    },
    hint: {
      ar: "هذا يقيس وظيفة الحاجز الجلدي وإنتاج الزهم الطبيعي",
      en: "This measures barrier function and natural sebum production"
    },
    options: [
      { id: "tight_flaky", label: { ar: "مشدودة، خشنة، أو متقشرة (تحتاجين ترطيب فوري)", en: "Tight, rough, or flaky (need immediate moisture)" }, weight: { skinTypes: { dry: 4 }, concerns: { dryness: 3 } } },
      { id: "shiny_oily", label: { ar: "لامعة بوضوح، ملمس دهني على الجبهة والأنف والذقن", en: "Visibly shiny, oily feel on forehead, nose, chin" }, weight: { skinTypes: { oily: 4 }, concerns: { oiliness: 3, large_pores: 2 } } },
      { id: "t_zone_only", label: { ar: "دهنية في منطقة T (الجبهة/الأنف) فقط، والخدود طبيعية/جافة", en: "Oily on T-zone only, cheeks normal/dry" }, weight: { skinTypes: { combination: 4 }, concerns: { oiliness: 1 } } },
      { id: "reactive", label: { ar: "حمراء، حارقة، أو تشعرين بالوخز", en: "Red, stinging, or burning sensation" }, weight: { skinTypes: { sensitive: 4 }, concerns: { sensitivity: 3, redness: 2 } } },
      { id: "comfortable", label: { ar: "مريحة، متوازنة، لا جفاف ولا لمعان", en: "Comfortable, balanced, neither dry nor shiny" }, weight: { skinTypes: { normal: 3 } } },
    ],
  },

  // Q2: Pore Visibility & Sebum Oxidation (المسام/الأكسدة)
  {
    id: "pores_sebum",
    question: {
      ar: "عند النظر إلى بشرتك في ضوء النهار، ما مدى وضوح المسام؟",
      en: "In daylight, how visible are your pores?"
    },
    hint: {
      ar: "حجم المسام يرتبط بنشاط الغدد الدهنية ونوعية الكيراتين",
      en: "Pore size correlates with sebaceous gland activity and keratin quality"
    },
    options: [
      { id: "invisible", label: { ar: "غير مرئية تقريباً، سطح البشرة أملس", en: "Barely visible, skin surface looks smooth" }, weight: { skinTypes: { normal: 2, dry: 1 } } },
      { id: "visible_t", label: { ar: "مرئية بوضوح على الأنف والجبهة فقط", en: "Clearly visible on nose and forehead only" }, weight: { skinTypes: { combination: 2 }, concerns: { large_pores: 2 } } },
      { id: "visible_all", label: { ar: "مرئية على معظم الوجه (الخدود، الأنف، الجبهة، الذقن)", en: "Visible on most of face (cheeks, nose, forehead, chin)" }, weight: { skinTypes: { oily: 3 }, concerns: { large_pores: 3, oiliness: 2 } } },
      { id: "congested", label: { ar: "مسام مسدودة/رؤوس سوداء واضحة", en: "Clogged pores, visible blackheads" }, weight: { skinTypes: { oily: 2, combination: 1 }, concerns: { acne: 2, large_pores: 2 } } },
    ],
  },

  // Q3: Reactivity & Barrier Integrity (الحساسية/سلامة الحاجز)
  {
    id: "reactivity",
    question: {
      ar: "عند تجربة منتج جديد (كريم، سيروم، منظف)، كيف تتفاعل بشرتك عادةً؟",
      en: "When trying a new product (cream, serum, cleanser), how does your skin typically react?"
    },
    hint: {
      ar: "رد الفعل الالتهابي السريع يدل على حاجز جلدي متأثر (TEWL مرتفع)",
      en: "Rapid inflammatory response indicates compromised barrier (high TEWL)"
    },
    options: [
      { id: "sting_burn", label: { ar: "شعور بوخز، حرقان، أو احمرار خلال دقائق", en: "Stinging, burning, or redness within minutes" }, weight: { skinTypes: { sensitive: 3 }, concerns: { sensitivity: 3, redness: 2 } } },
      { id: "breakout_late", label: { ar: "ظهور بثور أو حبوب بعد يوم-يومين", en: "Breakouts appear after 1-2 days" }, weight: { skinTypes: { oily: 2, combination: 1 }, concerns: { acne: 2 } } },
      { id: "no_reaction", label: { ar: "لا مشاكل، تتقبل معظم المنتجات بسهولة", en: "No issues, tolerates most products well" }, weight: { skinTypes: { normal: 2 } } },
      { id: "dry_irritated", label: { ar: "جفاف، تقشر، أو شعور بالضيق بعد الاستخدام", en: "Dryness, flaking, or tightness after use" }, weight: { skinTypes: { dry: 2 }, concerns: { dryness: 2 } } },
    ],
  },

  // Q4: Primary Concerns (الاهتمامات الأساسية - متعدد الاختيار)
  {
    id: "concerns",
    question: {
      ar: "ما المشكلات التي تزعجكِ أكثر في بشرتكِ؟ (يمكنكِ اختيار أكثر من إجابة)",
      en: "Which skin concerns bother you most? (Select all that apply)"
    },
    hint: {
      ar: "اختاري ما ينطبق عليكِ فعلياً، هذا يحدد أولويات العلاج",
      en: "Choose what truly applies to set treatment priorities"
    },
    multi: true,
    options: [
      { id: "acne", label: { ar: "حب الشباب والبثور النشطة", en: "Active acne and breakouts" }, weight: { concerns: { acne: 4 } } },
      { id: "pigmentation", label: { ar: "تصبغات، بقع داكنة، أو عدم توحد اللون", en: "Dark spots, pigmentation, uneven tone" }, weight: { concerns: { pigmentation: 4 } } },
      { id: "aging", label: { ar: "خطوط رفيعة، تجاعيد، أو ترهل", en: "Fine lines, wrinkles, loss of firmness" }, weight: { concerns: { aging: 4 } } },
      { id: "dryness", label: { ar: "جفاف مزمن، تقشر، أو خشونة", en: "Chronic dryness, flaking, rough texture" }, weight: { concerns: { dryness: 4, uneven_texture: 2 } } },
      { id: "redness", label: { ar: "احمرار مستمر، أوعية دموية ظاهرة (روزاسيا)", en: "Persistent redness, visible capillaries (rosacea)" }, weight: { concerns: { redness: 3, sensitivity: 2 } } },
      { id: "pores", label: { ar: "مسام واسعة، نسيج غير أملس", en: "Large pores, uneven texture" }, weight: { concerns: { large_pores: 3, uneven_texture: 2 } } },
      { id: "dark_circles", label: { ar: "هالات سوداء، انتفاخ تحت العين", en: "Dark circles, under-eye puffiness" }, weight: { concerns: { dark_circles: 3 } } },
      { id: "oiliness", label: { ar: "لمعان زائد، احتياج مستمر للمسح", en: "Excess shine, constant need for blotting" }, weight: { concerns: { oiliness: 3 } } },
    ],
  },

  // Q5: Photoaging / Lifestyle Factors (الشيخوخة الضوئية/نمط الحياة)
  {
    id: "photoaging",
    question: {
      ar: "ما مدى تعريضك للشمس، وما فئتك العمرية؟",
      en: "How much sun exposure do you get, and what is your age group?"
    },
    hint: {
      ar: "الأشعة فوق البنفسجية هي السبب الرئيسي للشيخوخة المبكرة (80% حسب الدراسات)",
      en: "UV radiation drives 80% of visible skin aging per clinical studies"
    },
    options: [
      { id: "young_protected", label: { ar: "أقل من 25، أستخدم واقي شمس يومياً", en: "Under 25, daily sunscreen user" }, weight: { skinTypes: { normal: 1 } } },
      { id: "young_unprotected", label: { ar: "أقل من 25، نادراً ما أستخدم واقي شمس", en: "Under 25, rarely use sunscreen" }, weight: { concerns: { pigmentation: 1, aging: 1 } } },
      { id: "adult_protected", label: { ar: "25-35، ملتزمة بواقي الشمس ومضادات الأكسدة", en: "25-35, consistent sunscreen & antioxidants" }, weight: { concerns: { pigmentation: 1, uneven_texture: 1 } } },
      { id: "adult_mixed", label: { ar: "25-35، استخدام غير منتظم لواقي الشمس", en: "25-35, inconsistent sunscreen use" }, weight: { concerns: { pigmentation: 2, aging: 1, uneven_texture: 1 } } },
      { id: "mature_protected", label: { ar: "36-45، روتين عناية كامل مع واقي شمس", en: "36-45, full routine with daily SPF" }, weight: { concerns: { aging: 2, pigmentation: 1 } } },
      { id: "mature_unprotected", label: { ar: "36-45، تعرض شمس متراكم دون حماية كافية", en: "36-45, accumulated sun without adequate protection" }, weight: { concerns: { aging: 3, pigmentation: 2, dryness: 1 } } },
      { id: "senior", label: { ar: "فوق 45، بشرة ناضجة تفتقر للكولاجين/الإيلاستين", en: "Over 45, mature skin with collagen/elastin loss" }, weight: { concerns: { aging: 4, dryness: 2, pigmentation: 1 } } },
    ],
  },
];

export function scoreQuiz(answers: Record<string, string[]>): QuizResult {
  const skinScores: Record<string, number> = {};
  const concernScores: Record<string, number> = {};

  const apply = (weight: QuizOptionWeight) => {
    if (weight.skinTypes) {
      for (const [type, n] of Object.entries(weight.skinTypes)) {
        skinScores[type] = (skinScores[type] || 0) + (n || 0);
      }
    }
    if (weight.concerns) {
      for (const [c, n] of Object.entries(weight.concerns)) {
        concernScores[c] = (concernScores[c] || 0) + (n || 0);
      }
    }
  };

  for (const question of quizQuestions) {
    const selected = answers[question.id] || [];
    for (const option of question.options) {
      if (selected.includes(option.id)) apply(option.weight);
    }
  }

  // أعلى نتيجتين للنوع، بحد أدنى "normal" إذا لم تسجل أي نقاط
  const skinTypes = (Object.keys(skinScores) as SkinType[])
    .filter((t) => t !== "all")
    .sort((a, b) => (skinScores[b] || 0) - (skinScores[a] || 0))
    .slice(0, 2);
  
  // الاهتمامات التي حصلت على ≥ 3 نقاط (عتبة أعلى للتأكد من الصلة)
  const skinConcerns = (Object.keys(concernScores) as SkinConcern[])
    .filter((c) => (concernScores[c] || 0) >= 3)
    .sort((a, b) => (concernScores[b] || 0) - (concernScores[a] || 0))
    .slice(0, 4);

  // قيم افتراضية آمنة
  if (skinTypes.length === 0) skinTypes.push("normal");
  if (skinConcerns.length === 0) skinConcerns.push("dryness");

  return { skinTypes, skinConcerns };
}