export interface FAQ {
  id: string;
  question: string;
  questionAr: string;
  answer: string;
  answerAr: string;
  category: string;
  categoryAr: string;
}

export const faqs: FAQ[] = [
  {
    id: "f1",
    question: "Are your products 100% authentic?",
    questionAr: "هل منتجاتكم أصلية 100%؟",
    answer: "Yes, all products sold on Luminous Derma are 100% authentic. We source directly from authorized distributors and official brand partners.",
    answerAr: "نعم، جميع المنتجات المباعة في لومينوس ديرما أصلية 100%. نحن نستورد مباشرة من الموزعين المعتمدين والشركاء الرسميين للعلامات التجارية.",
    category: "Products",
    categoryAr: "المنتجات",
  },
  {
    id: "f2",
    question: "What is your shipping policy?",
    questionAr: "ما هي سياسة الشحن؟",
    answer: "We offer shipping to all cities in Yemen. Free shipping is available for orders over 50,000 YER. Standard delivery takes 3-5 business days.",
    answerAr: "نقدم الشحن لجميع مدن اليمن. الشحن مجاني للطلبات التي تتجاوز 50,000 ريال يمني. التوصيل العادي يستغرق 3-5 أيام عمل.",
    category: "Shipping",
    categoryAr: "الشحن",
  },
  {
    id: "f3",
    question: "What is your return policy?",
    questionAr: "ما هي سياسة الإرجاع؟",
    answer: "We accept returns within 14 days of delivery. Products must be unopened and in their original packaging. Contact our customer service team to initiate a return.",
    answerAr: "نقبل الإرجاع خلال 14 يوماً من التوصيل. يجب أن تكون المنتجات غير مفتوحة وفي عبواتها الأصلية. اتصل بفريق خدمة العملاء لبدء عملية الإرجاع.",
    category: "Returns",
    categoryAr: "الإرجاع",
  },
  {
    id: "f4",
    question: "How does the loyalty program work?",
    questionAr: "كيف يعمل برنامج الولاء؟",
    answer: "Earn points with every purchase, review, and referral. Points can be redeemed for discounts, free shipping, and exclusive gifts. Members also enjoy birthday rewards and early access to new products.",
    answerAr: "اجمعي نقاطاً مع كل عملية شراء ومراجعة وإحالة. يمكن استبدال النقاط بخصومات وشحن مجاني وهدايا حصرية. كما يتمتع الأعضاء بمكافآت عيد الميلاد ووصول مبكر للمنتجات الجديدة.",
    category: "Loyalty",
    categoryAr: "الولاء",
  },
  {
    id: "f5",
    question: "Can I book a dermatologist consultation?",
    questionAr: "هل يمكنني حجز استشارة طبيب جلدية؟",
    answer: "Yes, we offer online dermatologist consultations. Browse our expert dermatologists, choose a convenient time slot, and book your consultation directly through the platform.",
    answerAr: "نعم، نقدم استشارات عبر الإنترنت مع أطباء الجلدية. تصفحي أطباءنا المتخصصين، اختاري الوقت المناسب، واحجزي استشارتك مباشرة من خلال المنصة.",
    category: "Services",
    categoryAr: "الخدمات",
  },
];