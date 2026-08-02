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

export const quizQuestions: QuizQuestion[] = [
  {
    id: "feel",
    question: { ar: "كيف يبدو ملمس بشرتكِ بعد غسلها مباشرة؟", en: "How does your skin feel right after cleansing?" },
    hint: { ar: "اخترِ الأقرب لحالتك المعتادة", en: "Choose the closest to your usual state" },
    options: [
      { id: "tight", label: { ar: "مشدودة وجافة وتحتاج لترطيب", en: "Tight, dry and needs moisture" }, weight: { skinTypes: { dry: 3 }, concerns: { dryness: 2 } } },
      { id: "shiny", label: { ar: "لامعة ودهنية فوراً", en: "Shiny and oily quickly" }, weight: { skinTypes: { oily: 3 }, concerns: { oiliness: 2 } } },
      { id: "mixed", label: { ar: "دهنية في منطقة T وجافة في الخدود", en: "Oily on the T-zone, dry on cheeks" }, weight: { skinTypes: { combination: 3 }, concerns: { oiliness: 1 } } },
      { id: "red", label: { ar: "محمرة ومتهيجة", en: "Red and irritated" }, weight: { skinTypes: { sensitive: 3 }, concerns: { sensitivity: 2, redness: 2 } } },
      { id: "balanced", label: { ar: "مريحة ومتوازنة", en: "Comfortable and balanced" }, weight: { skinTypes: { normal: 3 } } },
    ],
  },
  {
    id: "shine",
    question: { ar: "خلال منتصف اليوم، كيف تتغير بشرتكِ؟", en: "How does your skin change by mid-day?" },
    hint: { ar: "فكري في يوم عادي دون إعادة ترطيب", en: "Think of a normal day without re-moisturising" },
    options: [
      { id: "oily_noon", label: { ar: "تصبح لامعة وبحاجة لمسح الزيوت", en: "It gets shiny and needs oil-blotting" }, weight: { skinTypes: { oily: 2 }, concerns: { oiliness: 2 } } },
      { id: "slight", label: { ar: "لمعان خفيف على الجبهة والأنف", en: "Slight shine on forehead and nose" }, weight: { skinTypes: { combination: 2 } } },
      { id: "dull", label: { ar: "تبدو باهتة وجافة", en: "It looks dull and dry" }, weight: { skinTypes: { dry: 1 }, concerns: { dryness: 2 } } },
      { id: "flush", label: { ar: "تظهر بقع حمراء أو يشتد الاحمرار", en: "Red patches or more redness appear" }, weight: { skinTypes: { sensitive: 1 }, concerns: { redness: 2, sensitivity: 1 } } },
      { id: "same", label: { ar: "تبقى كما هي", en: "It stays the same" }, weight: { skinTypes: { normal: 2 } } },
    ],
  },
  {
    id: "concerns",
    question: { ar: "ما أكثر المشاكل التي تزعجكِ في بشرتكِ؟", en: "Which skin concerns bother you the most?" },
    hint: { ar: "يمكنكِ اختيار أكثر من إجابة", en: "You can select more than one" },
    multi: true,
    options: [
      { id: "acne", label: { ar: "حب الشباب والبثور", en: "Acne and breakouts" }, weight: { concerns: { acne: 3 } } },
      { id: "pig", label: { ar: "البقع الداكنة وتصبغات", en: "Dark spots and pigmentation" }, weight: { concerns: { pigmentation: 3 } } },
      { id: "aging", label: { ar: "الخطوط الرفيعة والتجاعيد", en: "Fine lines and wrinkles" }, weight: { concerns: { aging: 3 } } },
      { id: "dry", label: { ar: "الجفاف والتقشر", en: "Dryness and flaking" }, weight: { concerns: { dryness: 3 } } },
      { id: "red", label: { ar: "الاحمرار والحساسية", en: "Redness and sensitivity" }, weight: { concerns: { redness: 2, sensitivity: 2 } } },
      { id: "pores", label: { ar: "المسام الواسعة", en: "Large pores" }, weight: { concerns: { large_pores: 3 } } },
      { id: "dark", label: { ar: "الهالات السوداء", en: "Dark circles" }, weight: { concerns: { dark_circles: 3 } } },
      { id: "texture", label: { ar: "ملمس خشن أو غير متجانس", en: "Rough or uneven texture" }, weight: { concerns: { uneven_texture: 2 } } },
    ],
  },
  {
    id: "reaction",
    question: { ar: "كيف تتفاعل بشرتكِ مع منتجات جديدة؟", en: "How does your skin react to new products?" },
    options: [
      { id: "burn", label: { ar: "تشعرين بوخز أو احمرار غالباً", en: "I often feel stinging or redness" }, weight: { skinTypes: { sensitive: 2 }, concerns: { sensitivity: 2 } } },
      { id: "breakouts", label: { ar: "تظهر بثور في بعض الأحيان", en: "I get breakouts sometimes" }, weight: { skinTypes: { oily: 1 }, concerns: { acne: 2 } } },
      { id: "fine", label: { ar: "تتقبل معظم المنتجات", en: "It accepts most products" }, weight: { skinTypes: { normal: 1 } } },
      { id: "notsure", label: { ar: "لم أجرب الكثير", en: "I have not tried many" }, weight: { skinTypes: { normal: 1 } } },
    ],
  },
  {
    id: "age",
    question: { ar: "ما فئتك العمرية؟", en: "Which age group are you in?" },
    options: [
      { id: "a18", label: { ar: "أقل من 25", en: "Under 25" }, weight: { skinTypes: { oily: 1 }, concerns: { acne: 1 } } },
      { id: "a25", label: { ar: "من 25 إلى 35", en: "25 to 35" }, weight: { concerns: { pigmentation: 1, uneven_texture: 1 } } },
      { id: "a35", label: { ar: "من 36 إلى 45", en: "36 to 45" }, weight: { concerns: { aging: 1, pigmentation: 1 } } },
      { id: "a45", label: { ar: "فوق 45", en: "Over 45" }, weight: { concerns: { aging: 2, dryness: 1 } } },
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

  const skinTypes = (Object.keys(skinScores) as SkinType[])
    .filter((t) => t !== "all")
    .sort((a, b) => (skinScores[b] || 0) - (skinScores[a] || 0))
    .slice(0, 2);
  const skinConcerns = (Object.keys(concernScores) as SkinConcern[])
    .filter((c) => (concernScores[c] || 0) >= 2)
    .sort((a, b) => (concernScores[b] || 0) - (concernScores[a] || 0))
    .slice(0, 4);

  if (skinTypes.length === 0) skinTypes.push("normal");
  if (skinConcerns.length === 0) {
    skinConcerns.push("dryness");
  }

  return { skinTypes, skinConcerns };
}
