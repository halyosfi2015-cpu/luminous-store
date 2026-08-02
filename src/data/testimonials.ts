export interface Testimonial {
  id: string;
  name: string;
  nameAr: string;
  rating: number;
  text: string;
  textAr: string;
  title: string;
  titleAr: string;
  isVerified: boolean;
}

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Sarah M.",
    nameAr: "سارة م.",
    rating: 5,
    text: "Luminous Derma transformed my skincare routine. The products are authentic and the delivery was fast!",
    textAr: "لومينوس ديرما غيرت روتين العناية ببشرتي. المنتجات أصلية والتوصيل كان سريعاً!",
    title: "Verified Customer",
    titleAr: "عميلة موثقة",
    isVerified: true,
  },
  {
    id: "t2",
    name: "Noura A.",
    nameAr: "نورة ع.",
    rating: 5,
    text: "I love the dermatologist recommendations section. It helped me choose the right products for my skin type.",
    textAr: "أحب قسم توصيات أطباء الجلدية. ساعدني في اختيار المنتجات المناسبة لنوع بشرتي.",
    title: "Verified Customer",
    titleAr: "عميلة موثقة",
    isVerified: true,
  },
  {
    id: "t3",
    name: "Mariam K.",
    nameAr: "مريم ك.",
    rating: 5,
    text: "Finally a trusted beauty platform in Yemen! The prices are fair and the quality is premium.",
    textAr: "أخيراً منصة تجميل موثوقة في اليمن! الأسعار مناسبة والجودة ممتازة.",
    title: "Verified Customer",
    titleAr: "عميلة موثقة",
    isVerified: true,
  },
  {
    id: "t4",
    name: "Layan H.",
    nameAr: "ليان ه.",
    rating: 4,
    text: "Great selection of international brands. The customer service team was very helpful.",
    textAr: "تشكيلة رائعة من الماركات العالمية. فريق خدمة العملاء كان مفيداً جداً.",
    title: "Verified Customer",
    titleAr: "عميلة موثقة",
    isVerified: true,
  },
  {
    id: "t5",
    name: "Razan F.",
    nameAr: "رزان ف.",
    rating: 5,
    text: "The membership program is amazing! I love earning points on every purchase.",
    textAr: "برنامج العضوية رائع! أحب جمع النقاط مع كل عملية شراء.",
    title: "Verified Customer",
    titleAr: "عميلة موثقة",
    isVerified: true,
  },
];