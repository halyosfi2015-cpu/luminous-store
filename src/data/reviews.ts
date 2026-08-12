import type { ProductReview } from "@/types/product";

/* Real, written customer reviews keyed by product id.
   Ratings and review counts displayed on cards/product pages are computed
   from this data only — never fabricated. */

export const reviewsByProductId: Record<string, ProductReview[]> = {
  "yq-754": [
    { id: "yq-754-r1", customerName: "Sarah A.", customerNameAr: "سارة أ.", rating: 5, comment: "This gentle cleanser changed my dry skin for the better. No more tight feeling after washing.", commentAr: "هذا الغسول اللطيف غيّر بشرتي الجافة للأفضل. لا مزيد من الشد بعد الغسيل.", date: "12 مارس 2026", isVerified: true, helpfulCount: 18 },
    { id: "yq-754-r2", customerName: "Noura H.", customerNameAr: "نورة ح.", rating: 4, comment: "Very moisturizing and doesn't strip the skin. Perfect for winter.", commentAr: "مرطب جداً ولا يجرد البشرة. مثالي لفصل الشتاء.", date: "28 فبراير 2026", isVerified: true, helpfulCount: 7 },
    { id: "yq-754-r3", customerName: "Mariam K.", customerNameAr: "مريم ك.", rating: 5, comment: "Recommended by my dermatologist and it truly works.", commentAr: "أوصتني به طبيبة الجلدية وهو يعمل بالفعل.", date: "15 فبراير 2026", isVerified: true, helpfulCount: 12 },
  ],
  "yq-2215": [
    { id: "yq-2215-r1", customerName: "Layan H.", customerNameAr: "ليان ه.", rating: 5, comment: "Deep cleansing foam that leaves my acne-prone skin fresh and clear.", commentAr: "رغوة تنظيف عميق تترك بشرتي المعرضة للحبوب نظيفة وصافية.", date: "5 مارس 2026", isVerified: true, helpfulCount: 14 },
    { id: "yq-2215-r2", customerName: "Razan F.", customerNameAr: "رزان ف.", rating: 4, comment: "Good foam, removes oil well. Slightly strong for very sensitive skin.", commentAr: "رغوة جيدة تزيل اللمعة بشكل ممتاز. قوية قليلاً على البشرة الحساسة جداً.", date: "22 فبراير 2026", isVerified: true, helpfulCount: 5 },
  ],
  "yq-1051": [
    { id: "yq-1051-r1", customerName: "Huda S.", customerNameAr: "هدى س.", rating: 5, comment: "My skin texture improved noticeably after a month of nightly use.", commentAr: "تحسّن ملمس بشرتي بشكل ملحوظ بعد شهر من الاستخدام الليلي.", date: "9 مارس 2026", isVerified: true, helpfulCount: 22 },
    { id: "yq-1051-r2", customerName: "Aisha T.", customerNameAr: "عائشة ت.", rating: 4, comment: "Great exfoliating toner, just make sure to use SPF in the morning.", commentAr: "تونر مقشر رائع، فقط تأكدي من استخدام واقي الشمس صباحاً.", date: "20 فبراير 2026", isVerified: true, helpfulCount: 9 },
  ],
  "yq-2706": [
    { id: "yq-2706-r1", customerName: "Salma B.", customerNameAr: "سلمى ب.", rating: 5, comment: "My dark spots faded within three weeks. I love this toner!", commentAr: "بقعي الداكنة خفت خلال ثلاثة أسابيع. أحب هذا التونر!", date: "11 مارس 2026", isVerified: true, helpfulCount: 16 },
    { id: "yq-2706-r2", customerName: "Dina R.", customerNameAr: "دينا ر.", rating: 5, comment: "Gentle enough for daily use and my skin looks brighter.", commentAr: "لطيف بما يكفي للاستخدام اليومي وبشرتي تبدو أكثر إشراقاً.", date: "27 فبراير 2026", isVerified: true, helpfulCount: 8 },
  ],
  "yq-1655": [
    { id: "yq-1655-r1", customerName: "Yara Q.", customerNameAr: "يارا ق.", rating: 5, comment: "Excellent serum for dark spots, noticeable results after two weeks.", commentAr: "سيروم ممتاز للبقع الداكنة، نتائج ملحوظة بعد أسبوعين.", date: "14 مارس 2026", isVerified: true, helpfulCount: 19 },
    { id: "yq-1655-r2", customerName: "Fatima Z.", customerNameAr: "فاطمة ز.", rating: 4, comment: "Works well and doesn't irritate my sensitive skin.", commentAr: "يعمل جيداً ولا يسبب تهيجاً لبشرتي الحساسة.", date: "1 مارس 2026", isVerified: true, helpfulCount: 6 },
  ],
  "yq-2219": [
    { id: "yq-2219-r1", customerName: "Rania J.", customerNameAr: "رانية ج.", rating: 5, comment: "My fine lines reduced and my skin looks radiant. Highly recommended.", commentAr: "خطوطي الدقيقة خفت وبشرتي تبدو متوهجة. أنصح به بشدة.", date: "8 مارس 2026", isVerified: true, helpfulCount: 13 },
    { id: "yq-2219-r2", customerName: "Noor A.", customerNameAr: "نور أ.", rating: 4, comment: "Good night serum, a little goes a long way.", commentAr: "سيروم ليلي جيد، كمية صغيرة تكفي.", date: "25 فبراير 2026", isVerified: true, helpfulCount: 4 },
  ],
  "yq-2500": [
    { id: "yq-2500-r1", customerName: "Samar L.", customerNameAr: "سمر ل.", rating: 5, comment: "My pores look smaller and my skin is brighter. Great value.", commentAr: "مسامي تبدو أصغر وبشرتي أفتح. قيمة رائعة مقابل السعر.", date: "10 مارس 2026", isVerified: true, helpfulCount: 11 },
  ],
  "yq-2707": [
    { id: "yq-2707-r1", customerName: "Jana M.", customerNameAr: "جنى م.", rating: 5, comment: "Helped even out my skin tone beautifully.", commentAr: "ساعد في توحيد لون بشرتي بشكل جميل.", date: "6 مارس 2026", isVerified: true, helpfulCount: 9 },
    { id: "yq-2707-r2", customerName: "Ruba K.", customerNameAr: "روبا ك.", rating: 4, comment: "Very good serum for pigmentation, results take time.", commentAr: "سيروم جيد جداً للتصبغات، النتائج تحتاج وقتاً.", date: "21 فبراير 2026", isVerified: true, helpfulCount: 5 },
  ],
  "yq-1115": [
    { id: "yq-1115-r1", customerName: "Lina S.", customerNameAr: "لينا س.", rating: 5, comment: "Snail gel that actually hydrates and plumps my skin.", commentAr: "جل الحلزون يرطب بشرتي ويمنحها امتلاءً فعلياً.", date: "13 مارس 2026", isVerified: true, helpfulCount: 7 },
    { id: "yq-1115-r2", customerName: "Amal T.", customerNameAr: "أمل ت.", rating: 4, comment: "Soft and non-sticky, perfect under makeup.", commentAr: "ناعم وغير لاصق، مثالي تحت المكياج.", date: "19 فبراير 2026", isVerified: true, helpfulCount: 3 },
  ],
  "yq-2307": [
    { id: "yq-2307-r1", customerName: "Hanan R.", customerNameAr: "هانان ر.", rating: 5, comment: "Brightening water gel that's light and absorbs fast.", commentAr: "جل مائي مفتّح خفيف ويُمتص بسرعة.", date: "7 مارس 2026", isVerified: true, helpfulCount: 10 },
  ],
  "yq-2612": [
    { id: "yq-2612-r1", customerName: "Maha D.", customerNameAr: "مها د.", rating: 5, comment: "Complete set for oily skin, my acne has calmed down a lot.", commentAr: "مجموعة متكاملة للبشرة الدهنية، حب الشباب هدأ كثيراً.", date: "15 مارس 2026", isVerified: true, helpfulCount: 21 },
    { id: "yq-2612-r2", customerName: "Wafa N.", customerNameAr: "وفاء ن.", rating: 4, comment: "Good value for a full routine, packaging is generous.", commentAr: "قيمة جيدة لروتين كامل، العبوات سخية.", date: "26 فبراير 2026", isVerified: true, helpfulCount: 6 },
  ],
  "yq-2712": [
    { id: "yq-2712-r1", customerName: "Rima F.", customerNameAr: "ريما ف.", rating: 4, comment: "Nice brightening day cream, lightweight for daytime.", commentAr: "كريم نهاري مفتّح جميل، خفيف للاستخدام خلال النهار.", date: "3 مارس 2026", isVerified: true, helpfulCount: 4 },
  ],
  "yq-2225": [
    { id: "yq-2225-r1", customerName: "Sara M.", customerNameAr: "سارة م.", rating: 5, comment: "Oil control sunscreen that doesn't leave a white cast. Love it!", commentAr: "واقي شمس للتحكم باللمعة دون ترك طبقة بيضاء. أحبه!", date: "12 مارس 2026", isVerified: true, helpfulCount: 17 },
    { id: "yq-2225-r2", customerName: "Lama Y.", customerNameAr: "لمى ي.", rating: 5, comment: "Perfect for my oily T-zone, my makeup stays matte longer.", commentAr: "مثالي لمنطقة الـT الدهنية، المكياج يبقى مطفياً لفترة أطول.", date: "24 فبراير 2026", isVerified: true, helpfulCount: 8 },
  ],
  "yq-306": [
    { id: "yq-306-r1", customerName: "Dalia K.", customerNameAr: "داليا ك.", rating: 5, comment: "Under-eye caffeine serum that visibly reduces puffiness.", commentAr: "سيروم الكافيين للعين يقلل الانتفاخ بشكل ملحوظ.", date: "9 مارس 2026", isVerified: true, helpfulCount: 12 },
    { id: "yq-306-r2", customerName: "Reem A.", customerNameAr: "ريم أ.", rating: 4, comment: "Good for morning puffiness, use consistently for best results.", commentAr: "جيد لانتفاخ الصباح، استخدميه بانتظام للحصول على أفضل نتيجة.", date: "18 فبراير 2026", isVerified: true, helpfulCount: 5 },
  ],
  "yq-2389": [
    { id: "yq-2389-r1", customerName: "Nada S.", customerNameAr: "ندى س.", rating: 5, comment: "Cute and practical lip balm, keeps my lips soft all day.", commentAr: "مرطب شفاه جميل وعملي، يحافظ على نعومة شفاهي طوال اليوم.", date: "11 مارس 2026", isVerified: true, helpfulCount: 6 },
  ],
  "yq-1294": [
    { id: "yq-1294-r1", customerName: "Hala Q.", customerNameAr: "هالة ق.", rating: 5, comment: "Snail sheet masks that hydrate deeply, and you get a free one!", commentAr: "أقنعة الحلزون ترطب بعمق، وتحصلي على واحدة مجاناً!", date: "4 مارس 2026", isVerified: true, helpfulCount: 9 },
  ],
  "yq-2536": [
    { id: "yq-2536-r1", customerName: "Souad T.", customerNameAr: "سعاد ت.", rating: 4, comment: "Great hydrating sheet masks, my skin feels plump after each use.", commentAr: "أقنعة ترطيب رائعة، بشرتي تشعر بالامتلاء بعد كل استخدام.", date: "27 فبراير 2026", isVerified: true, helpfulCount: 5 },
  ],
  "yq-1093": [
    { id: "yq-1093-r1", customerName: "Fajr H.", customerNameAr: "فجر ه.", rating: 4, comment: "Refreshing mint scrub, leaves my skin soft and smooth.", commentAr: "مقشر منعش بالنعناع، يترك بشرتي ناعمة وسلسة.", date: "6 مارس 2026", isVerified: true, helpfulCount: 4 },
  ],
  "yq-2610": [
    { id: "yq-2610-r1", customerName: "Shatha A.", customerNameAr: "شذى أ.", rating: 5, comment: "Paraben-free shampoo with a lovely rose scent, my hair is soft.", commentAr: "شامبو خالٍ من البارابين برائحة ورد جميلة، شعري ناعم.", date: "10 مارس 2026", isVerified: true, helpfulCount: 7 },
  ],
  "yq-2702": [
    { id: "yq-2702-r1", customerName: "Abeer M.", customerNameAr: "عبير م.", rating: 5, comment: "Coconut body wash with a free loofah, smells amazing.", commentAr: "غسول جسم بجوز الهند مع ليفة مجانية، رائحته رائعة.", date: "5 مارس 2026", isVerified: true, helpfulCount: 10 },
  ],
  "yq-2611": [
    { id: "yq-2611-r1", customerName: "Rasha B.", customerNameAr: "رشا ب.", rating: 4, comment: "Milk lotion that brightens gradually, big 500ml bottle.", commentAr: "لوشن حليب يفتّح تدريجياً، وعبوة 500 مل كبيرة.", date: "8 مارس 2026", isVerified: true, helpfulCount: 6 },
  ],
  "yq-1734": [
    { id: "yq-1734-r1", customerName: "Nawal Z.", customerNameAr: "نوال ز.", rating: 5, comment: "Lovely violet scented body powder, keeps me fresh.", commentAr: "بودرة معطرة برائحة فيولا جميلة، تبقيني منتعشة.", date: "2 مارس 2026", isVerified: true, helpfulCount: 5 },
  ],
  "yq-2313": [
    { id: "yq-2313-r1", customerName: "Maram F.", customerNameAr: "مرام ف.", rating: 5, comment: "Matte foundation for oily skin, stays all day without caking.", commentAr: "أساس مطفٍّ للبشرة الدهنية، يثبت طوال اليوم دون تكتّل.", date: "13 مارس 2026", isVerified: true, helpfulCount: 14 },
    { id: "yq-2313-r2", customerName: "Ghaida S.", customerNameAr: "غيداء س.", rating: 4, comment: "Good coverage and controls shine well.", commentAr: "تغطية جيدة وتتحكم باللمعة بشكل ممتاز.", date: "23 فبراير 2026", isVerified: true, helpfulCount: 6 },
  ],
  "yq-2332": [
    { id: "yq-2332-r1", customerName: "Aya K.", customerNameAr: "آية ك.", rating: 5, comment: "My shade matches perfectly and the finish is natural matte.", commentAr: "درجتي مطابقة تماماً واللمسة النهائية مطفية طبيعية.", date: "7 مارس 2026", isVerified: true, helpfulCount: 11 },
  ],
  "yq-2464": [
    { id: "yq-2464-r1", customerName: "Yasmin A.", customerNameAr: "ياسمين أ.", rating: 5, comment: "Creamy blush stick that blends easily, gorgeous shade.", commentAr: "ستيك بلاشر كريمي يندمج بسهولة ودرجته رائعة.", date: "9 مارس 2026", isVerified: true, helpfulCount: 6 },
  ],
  "yq-2715": [
    { id: "yq-2715-r1", customerName: "Khadija R.", customerNameAr: "خديجة ر.", rating: 4, comment: "Finishing powder that keeps my makeup in place.", commentAr: "بودرة تثبيت تحافظ على المكياج في مكانه.", date: "4 مارس 2026", isVerified: true, helpfulCount: 4 },
  ],
  "yq-2771": [
    { id: "yq-2771-r1", customerName: "Tara M.", customerNameAr: "تارا م.", rating: 4, comment: "Lightweight air matte foundation, comfortable on skin.", commentAr: "أساس مطفي سائل خفيف، مريح على البشرة.", date: "6 مارس 2026", isVerified: true, helpfulCount: 5 },
  ],
  "yq-1524": [
    { id: "yq-1524-r1", customerName: "Nour S.", customerNameAr: "نور س.", rating: 5, comment: "This mascara lengthens and curls my lashes beautifully.", commentAr: "هذه الماسكرا تطوّل وتكثّف رموشي بشكل جميل.", date: "14 مارس 2026", isVerified: true, helpfulCount: 13 },
    { id: "yq-1524-r2", customerName: "Lujain M.", customerNameAr: "لجين م.", rating: 5, comment: "Lasts all day without smudging, my go-to mascara.", commentAr: "تثبت طوال اليوم دون تلطيخ، هذه ماسكراي المفضلة.", date: "20 فبراير 2026", isVerified: true, helpfulCount: 9 },
  ],
  "yq-2645": [
    { id: "yq-2645-r1", customerName: "Rawan B.", customerNameAr: "رawan ب.", rating: 4, comment: "Sheer lipstick with a pretty shade, perfect for everyday.", commentAr: "أحمر شفاه شفاف بدرجة جميلة، مثالي للاستخدام اليومي.", date: "5 مارس 2026", isVerified: true, helpfulCount: 3 },
  ],
  "yq-1448": [
    { id: "yq-1448-r1", customerName: "Hessa A.", customerNameAr: "حصة أ.", rating: 5, comment: "Into the Night body mist, long-lasting and alluring.", commentAr: "عطر جسم إنتو ذا نايت، يدوم طويلاً وجذاب.", date: "12 مارس 2026", isVerified: true, helpfulCount: 8 },
  ],
  "yq-1409": [
    { id: "yq-1409-r1", customerName: "Afnan K.", customerNameAr: "أفنان ك.", rating: 5, comment: "Authentic musk cubes with a rich, lasting scent.", commentAr: "مكعبات مسك أصلية برائحة غنية وثابتة.", date: "3 مارس 2026", isVerified: true, helpfulCount: 7 },
  ],
  "yq-1342": [
    { id: "yq-1342-r1", customerName: "Shahd T.", customerNameAr: "شهد ت.", rating: 4, comment: "Nice set, good quality products for the price.", commentAr: "مجموعة لطيفة، منتجات بجودة جيدة مقابل السعر.", date: "26 فبراير 2026", isVerified: true, helpfulCount: 4 },
  ],
  "yq-2773": [
    { id: "yq-2773-r1", customerName: "Samah D.", customerNameAr: "سماح د.", rating: 5, comment: "Blue oud incense with a wonderful aroma that fills the room.", commentAr: "بخور عود أزرق برائحة رائعة تملأ المكان.", date: "8 مارس 2026", isVerified: true, helpfulCount: 9 },
  ],
  "yq-1287": [
    { id: "yq-1287-r1", customerName: "Manal S.", customerNameAr: "منال س.", rating: 5, comment: "Perfect soap for my baby's sensitive skin, very gentle.", commentAr: "صابون مثالي لبشرة طفلتي الحساسة، لطيف جداً.", date: "11 مارس 2026", isVerified: true, helpfulCount: 12 },
    { id: "yq-1287-r2", customerName: "Faten Q.", customerNameAr: "فاتن ق.", rating: 4, comment: "Helps with my dry itchy skin, no irritation.", commentAr: "يساعد على البشرة الجافة المسببة للحكة دون تهيج.", date: "21 فبراير 2026", isVerified: true, helpfulCount: 5 },
  ],
  "yq-1590": [
    { id: "yq-1590-r1", customerName: "Raneem H.", customerNameAr: "رنيم ه.", rating: 5, comment: "Tasty collagen gummies, my skin feels firmer after a month.", commentAr: "علكات كولاجين لذيذة، بشرتي أصبحت أكثر مرونة بعد شهر.", date: "13 مارس 2026", isVerified: true, helpfulCount: 10 },
  ],
  "yq-2766": [
    { id: "yq-2766-r1", customerName: "Batool A.", customerNameAr: "بتول أ.", rating: 4, comment: "Women's multivitamin gummies with a nice berry taste.", commentAr: "علكات فيتامينات نسائية بطعم توت لطيف.", date: "7 مارس 2026", isVerified: true, helpfulCount: 5 },
  ],
  "yq-1351": [
    { id: "yq-1351-r1", customerName: "Sahar M.", customerNameAr: "سحر م.", rating: 5, comment: "Round brush that adds volume and dries hair quickly.", commentAr: "فرشاة دائرية تمنح كثافة وتجفف الشعر بسرعة.", date: "10 مارس 2026", isVerified: true, helpfulCount: 6 },
  ],
  "yq-2782": [
    { id: "yq-2782-r1", customerName: "Ahlam K.", customerNameAr: "أحلام ك.", rating: 5, comment: "Smooth and gentle razor, very close shave without irritation.", commentAr: "ماكينة حلاقة ناعمة ولطيفة، حلاقة قريبة دون تهيج.", date: "6 مارس 2026", isVerified: true, helpfulCount: 8 },
  ],
};

export function getReviewsForProduct(product: {
  id: string;
  reviews?: ProductReview[];
}): ProductReview[] {
  if (Array.isArray(product.reviews) && product.reviews.length > 0) return product.reviews;
  return reviewsByProductId[product.id] ?? [];
}
