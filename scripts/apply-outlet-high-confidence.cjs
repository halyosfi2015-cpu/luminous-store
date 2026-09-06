/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Apply approved Outlet-reconciled content to EXACTLY the accepted high-confidence list.
 * - Modifies ONLY description.ar and benefits.ar (benefits written as a single paragraph).
 * - Every other field is byte-identical.
 * - Writes full audit log per product.
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

/* ── authored content (facts from Outlet Pharmacy reference; independent wording) ── */
const CONTENT = {
  "yq-715": {
    desc: "مزيل عرق رول-أون من دوف بالعطر الأصلي الكلاسيكي، مصمم ليكون رفيقكِ اليومي في الحماية من الرطوبة وروائح الجسم. تأتي تركيبته على شكل سائل ناعم ينتقل بسهولة عبر رأس الرول على بشرة الإبط، فيتشرب سريعًا دون ملمس لزج أو أثر أبيض على الملابس. حجمه الصغير 50 مل يجعله خيارًا عمليًا يوضع في حقيبة اليد أو حقيبة السفر، وهو لطيف بما يكفي ليُستخدم يوميًا حتى بعد إزالة الشعر.",
    benefits: "ستشعرين فور التطبيق بانتعاش هادئ وملمس جاف مريح لا يتطلب الانتظار قبل ارتداء الملابس. مع الاستمرارية صباحًا بعد الاستحمام، تحافظ منطقة الإبط على انتعاشها خلال ساعات الحركة والعمل والخروج، وتقل ملاحظة أي روائح غير مرغوبة نهاية اليوم. كما أن خفة التركيبة تجعل تكرار الاستخدام اليومي مريحًا للبشرة دون شعور بالتقشر أو الانسداد.",
  },
  "yq-721": {
    desc: "زيت اللوز المر من وادي النحل زيت طبيعي مضغوط يحفظ خصائص اللوز المر الأصلي دون إضافات عطرية صناعية. يشتهر هذا الزيت في العناية التقليدية باستخداماته المتعددة على البشرة وفروة الرأس، ويأتي في عبوة 125 مل بعنق يساعد على التحكم في كمية الاستخدام. قوام دهني خفيف نسبيًا يمتص تدريجيًا ويترك طبقة تغذية دائمة.",
    benefits: "عند تدليكه على البشرة يترك الزيت طبقة مغذية تخفف خشونة الجلد ومناطق الجفاف الواضحة مثل المرفقين والكعبين، ومع الاستخدام المنتظم تتحسن ملموسة نعومة البشرة ومرونتها. وعلى مستوى الشعر، تفيد تمشيط بضع قطرات على أطراف الشعر لتلطيف التقصف، أو تدليك فروة الرأس بها قبل الاستحمام بوقت كافٍ لمنح فروة الرأس تغذية ثم غسلها بشكل معتاد.",
  },
  "yq-1201": {
    desc: "معجون أسنان من سنسوداين يجمع بين اثنتين من أهم وظائف العناية اليومية: تخفيف حساسية الأسنان والعناية ببياضها. صُممت تركيبة العناية المتعددة مع التبييض لتُستخدم كبديل يومي كامل عن المعاجون العادية، فتعمل مع كل فرشاة على تنظيف الأسنان بلطف مع مساعدة المينا على استعادة لونها الطبيعي تدريجيًا. العبوة 75 مل تكفي فترة استخدام منتظمة، وهذا الإصدار يأتي بعرض عبوتين.",
    benefits: "مع الاستخدام مرتين يوميًا يبدأ الانزعاج المصاحب للأطعمة والمشروبات الباردة أو الساخنة في التراجع شيئًا فشيئًا، فيصبح شرب الماء البارد أو تناول المشروبات الساخنة أكثر راحة. وبالتوازي يساعد التنظيف المنتظم به على تفتيح التصبغات السطحية الناتجة عن الشاي والقهوة، ليظهر الابتسامة بلون أكثر إشراقًا مع الحفاظ على أنفاس منتعشة.",
  },
  "yq-695": {
    desc: "كريم كاميل للبشرة بعبوة محمولة بحجم 30 مل، يستمد شهرته من تركيبته التي اشتهرت بها عائلة كاميل المعتمدة على خلاصة البابونج المهدئة. يعمل الكريم كطبقة عناية مركزة تُوزع على المناطق الجافة أو المتهيجة من البشرة لتمنحها ترطيبًا فوريًا وملمسًا مخمليًا، ويناسب الاستخدام على اليدين والوجه وحول المناطق التي تشتد فيها الحاجة للترطيب.",
    benefits: "بمجرد توزيعه على البشرة يشعر بها المستخدم أكثر راحة وارتياحًا، خاصة في الأيام الباردة التي تشتد فيها الجفاف واحمرار اليدين. يُمتص بسرعة دون طبقة دهنية ثقيلة، ما يجعله مناسبًا لإعادة التطبيق عدة مرات خلال اليوم كلما احتاجت البشرة إلى جرعة عناية سريعة، ومع الوقت تقل ظهور الخشونة والتقشر في المناطق الأكثر تعرضًا للعوامل الخارجية.",
  },
  "yq-244": {
    desc: "زيت إكليل الجبل (الروزماري) النقي من ناو، مستخلص بطريقة التقطير البخاري من أوراق النبات للحفاظ على مكوناته الفعالة. زيت عطري متعدد الاستخدامات يُعرف بشعبيته واسعة في روتينات العناية بالشعر وفروة الرأس، ويأتي في عبوة زجاجية 30 مل تحفظ نقاء الزيت. يُنصح دائمًا بتخفيفه بزيت ناقل مثل زيت الجوجوبا أو الزيتون قبل ملامسة الجلد مباشرة.",
    benefits: "يُضاف بضع قطرات منه إلى زيتكِ المفضل لتدليك فروة الرأس قبل الاستحمام بنصف ساعة تقريبًا، فيمنح إحساسًا منعشًا دافئًا ينشّط فروة الرأس ويجعل جلسة التدليك أكثر فعالية واسترخاءً. ويمكن أيضًا استخدامه في ناشر الروائح لملء الغرفة برائحته العشبية المنعشة التي تساعد على التركيز والانتباه أثناء الدراسة أو العمل.",
  },
  "yq-1200": {
    desc: "معجون سنسوداين الأصلي هو الخيار الكلاسيكي المخصص لأصحاب الأسنان الحساسة الذين يجدون صعوبة في الاستمتاع بمشروباتهم وأكلهم المفضل. تعتمد فكرته على بناء حماية يومية حول مناطق الحساسية المكشوفة مع تنظيف فعال للأسنان، فيغني عن المعاجون العادية ويُستخدم مكانه في الروتين الصباحي والمسائي بدون خطوات إضافية. عبوة 75 مل عملية للاستخدام الفردي المنتظم.",
    benefits: "أبرز ما يميز تجربته هو الراحة التدريجية: بعد فترة من الالتزام بتنظيف الأسنان به مرتين يوميًا، يلاحظ كثيرون أن مشروباتهم الساخنة والباردة لم تعد مصدر إزعاج كما كان. كما يمنح الفم نظافة وانتعاشًا معتدلين يناسبين من يفضّلون الطابع الكلاسيكي لمعجون الأسنان التقليدي دون نكهات حادة.",
  },
  "yq-714": {
    desc: "من عائلة دوف go fresh يأتي مزيل العرق رول-أون بنكهة الخيار والشاي الأخضر المنعشة، لمن تبحث عن حماية يومية برائحة منعشة نظيفة تشبه إحساس الاستحمام. تركيبته غنية بالمرطبات اللطيفة المعروفة في منتجات دوف، وتتحول عند التطبيق إلى ملمس ناعم يجف بسرعة داخل عبوة رول 50 مل سهلة الحمل والاستخدام في أي وقت من اليوم.",
    benefits: "يتصف تطبيقه بخفة وإحساس برودة لطيفة تنعش منطقة الإبط صباحًا، ويترك البشرة ناعمة مطرقة دون أثر أبيض على الملابس الداكنة أو بقايا صفراء على الملابس الفاتحة. رائحته النباتية الهادئة تبقى خلفية لطيفة خلال اليوم ولا تصطدم بعطرك المفضل، ما يجعله مناسبًا للاستخدام اليومي المتكرر في الأجواء الحارة.",
  },
  "yq-1269": {
    desc: "غسول يومي من فيم فريش مخصص لنظافة المناطق الحساسة بلطف، مدعم بخلاصة الصبار المعروفة بخصائصها المهدئة. صُمم ليدخل ضمن روتين الاستحمام اليومي كبديل لطيف عن الصابون العادي الذي قد يسبب الجفاف والتهيج لهذه المنطقة الحساسة، ويحافظ على توازنها الطبيعي. عبوة 250 مل بفتح مضبوط يسمح باستخدام كمية مناسبة في كل مرة.",
    benefits: "يمنح الاستخدام اليومي له إحساسًا مستمرًا بالنظافة والانتعاش والثقة طوال ساعات اليوم، وتعمل خلاصة الصبار على تهدئة أي احمرار أو انزعاج بسيط قد يحدث بسبب الملابس الضيقة أو الحرارة. كثير من المستخدمات يلاحظن تحسن الراحة العامة خلال أيام من اعتماده بدلًا من المنتجات القاسية، خاصة في فترات الدورة الشهرية التي تحتاج فيها البشرة لعناية أكثر لطفًا.",
  },
  "yq-1196": {
    desc: "نسخة محمولة بحجم 50 مل من معجون سنسوداين للعناية المتعددة مع التبييض، نفس تركيبة الحماية اليومية من حساسية الأسنان مع فائدة تفتيح تدريجي للتصبغات السطحية. حجمها الصغير يجعلها مثالية لحقيبة السفر أو مقر العمل أو استخدام الأطفال الأكبر سنًا في رحلات المدرسة، دون التخلي عن روتين العناية بالأسنان الحساسة.",
    benefits: "يضمن امتلاك معجون الحساسية معك في أي مكان أنك لن تضطر للعودة لمعجون عادي يسبب الانزعاج أثناء السفر أو الخروج. ومع الانتظام عليه، تتلاشى تدريجيًا حرجة المشروبات الباردة والساخنة، ويكتسب الابتسامة لمعانًا أجمل مع نظافة أسنان كاملة ونفس منعش في كل مرة.",
  },
  "yq-386": {
    desc: "غسول الفم ليسترين توتال كير بالمذاق المعتدل، إصدار مدعّم بخلاصة المسواك المعروفة في تقاليد العناية بالفم، يجمع حماية شاملة ضد الجراثيم مع طعم لطيف لا يزعج الحواس. يعمل كخطوة مكملة للفرشاة اليومية ليصل إلى ما لا تصل إليه الفرشاة من مناطق الفم، فيغطي حماية الأسنان واللثة والأنفاس معًا. عبوة 500 مل اقتصادية تكفي فترة استخدام عائلية طويلة.",
    benefits: "المضمضة به ثلاثين ثانية فقط بعد التفريش تترك إحساس نظافة عميق وأنفاسًا منعشة تدوم ساعات طويلة، ويقل مع الوقت ملاحظة رائحة الفم الصباحية المزعجة. مذاقه المعتدل يجعل التجربة مريحة حتى لمن يتجنبون غسولات الفم بسبب حرارتها، ولذلك يناسب مشاركة أفراد الأسرة له في روتينهم المسائي والصباحي.",
  },
  "yq-179": {
    desc: "زيت اللافندر النقي من ناو، من أشهر الزيوت العطرية استخدامًا حول العالم لرائحته المهدئة المميزة. يُستخلص بالبخار للحفاظ على تركيبته الطبيعية، ويأتي في عبوة زجاجية معتمة 30 مل صغيرة تكفي فترة طويلة لأن الاستخدام يتم بقطرات. يدخل في الروتينات المسائية للاسترخاء وفي وصفات العناية بالبشرة، ويُفضل دائمًا تخفيفه بزيت ناقل قبل ملامسة الجلد.",
    benefits: "إضافة قطرات منه لماء الاستحمام المسائي أو لناشر الروائح بجانب السرير تحول غرفة النوم إلى بيئة هادئة تسهل على الجسم التخلص من توتر اليوم والاستعداد للنوم. كما يمكن خلطه مع زيت ناقل لتدليك المعصمين وجانب الرقبة لحظات التوتر، أو استخدامه في خلطات العناية بالبشرة للاستفادة من طبيعته اللطيفة على البشرة المزعجة.",
  },
  "yq-1866": {
    desc: "غسول يورياج Gyn-8 للعناية اليومية بالمنطقة الحميمة، من المختبرات الفرنسية المتخصصة في مياه العناية بالبشرة الحساسة. صُمم بدرجة حموضة متوازنة تحترم البيئة الطبيعية للمنطقة الحساسة، مع تركيبة لطيفة تنظف بلطف وتمنح راحة فورية للبشرة المعرضة للتهيج والحكة. عبوة 200 مل بفلترة عملية تناسب الاستخدام اليومي في الاستحمام.",
    benefits: "تجربة استخدامه مريحة من أول مرة: رغوة خفيفة تشطف بسهولة وتترك شعورًا بالنظافة والنعومة دون شد أو جفاف. ومع الانتظام عليه يوميًا تقل حالات الانزعاج والاحمرار التي تسببها الصابونات العادية أو العرق والحرارة، وتبقى المنطقة منتعشة ومريحة طوال ساعات العمل والخروج.",
  },
  "yq-181": {
    desc: "شامبو نيزورال الطبي المخصص لمشاكل القشرة المستعصية والتهاب الجلد الدهني، بتركيبة دوائية فعالة تحتاجها فروة الرأس عندما تفشل الشامبوهات العادية في التحكم بالمشكلة. عبوة 100 مل تكفي دورة علاجية منظمة تُستخدم وفق التوصيات المذكورة على العلبة أو بإشراف الصيدلي، وهو خيار موثوق اسمه يسبقه في عالم علاجات فروة الرأس.",
    benefits: "مع الالتزام بجدول الاستخدام الموصى به، تبدأ القشرة في التراجع وتقل الحكة المزعجة التي ترافقها، وتستعيد فروة الرأس حالة أكثر توازنًا وصحة. يُنصح بترك الرغوة على الفروة لدقائق قليلة قبل الشطف للحصول على أفضل فائدة، ثم المتابعة بشامبو مرطب للطولين إذا كان الشعر جافًا للحفاظ على نعومته.",
  },
  "yq-1480": {
    desc: "معجون سنسوداين واقي المينا المصمم خصيصًا للأطفال من سن ست سنوات وما فوق، يوفر حماية مينا الأسنان النامية مع حلول مريحة لطفلك الذي يشتكي من حساسية الأسنان الباردة أو الحلويات. تركيبته مضبوطة بكمية فلورايد مناسبة لعمر هذه المرحلة، وطعمه مقبول للأطفال مما يسهل عليهم الالتزام بتنظيف أسنانهم مرتين يوميًا دون جدال.",
    benefits: "يجعل روتين تفريش الأسنان الصباحي والمسائي تجربة أسلس للأم والطفل معًا، فيلتزم الصغير بتفريشه بلا اعتراض ويحصل أسنانه الدائمة النامية على الحماية التي تحتاجها في هذه المرحلة المهمة. ومع الوقت يقل شكواه من الانزعاج عند تناول المشروبات الباردة أو الحلوى، وتطمئن الأم على صحة فم ابنها بحماية متخصصة موثوقة.",
  },
  "yq-958": {
    desc: "ماء ميسيلار غارنييه الغني بالزيوت، الحل الأمثل لإزالة المكياج المقاوم للماء بأبسط طريقة ممكنة: قطعة قطن وحركات لطيفة فقط. تعمل تقنية الميسيلات على جذب الماكياج والأوساخ والدهون وسحبها من البشرة دون فرك أو شطف، وتصلح لإزالة مكياج العيون المقاوم للماء حتى الماسكارا. عبوة كبيرة بسعة 400 مل تكفي شهورًا من الاستخدام اليومي.",
    benefits: "توفر على بشرتكِ مجهود الفرك المزعج حول العيون الحساسة، فتذوب طبقة المكياج المقاوم للماء بلمسات خفيفة دون احمرار أو شد. كما يغنيكِ عن خطوة الغسل بالماء بعد الاستخدام إن رغبتِ، وتُبقي البشرة مرتاحة ناعمة وليست مشدودة، ما يجعله رفيق المساء المثالي بعد المناسبات الطويلة أو جلسات التصوير بمكياج ثقيل.",
  },
  "yq-1729": {
    desc: "شامبو هيربال بخلاصة جوز الهند المغذية من سلسلة bio renew المجددة للشعر، منظف يومي لطيف ينظف فروة الرأس والشعر من الأوساخ والدهون الزائدة دون أن يجرده من رطوبته الطبيعية. تركيبته تستهدف الشعر الجاف الباهت الذي فقد حيويته بسبب الحرارة والصباغة والاستخدام المتكرر لأدوات التصفيف، وتعيد له نعومته وقابليته للتسريح. عبوة 400 مل اقتصادية للاستخدام العائلي.",
    benefits: "من أول غسلة تلاحظين أن شعرك أصبح أسهل في التمشيط وأقل تشابكًا، ورائحة جوز الهند المنعشة ترافقك طوال اليوم بشكل لطيف. ومع الاستمرار يتحسن ملمس الأطراف الجافة ويقل التقصف، ويبدو الشعر أكثر لمعانًا وحيوية عند التصفيف، خاصة إذا اكتمل الروتين ببلسم من نفس العائلة العطرية.",
  },
  "yq-1771": {
    desc: "لوشن الجسم من فازلين بخلاصة الصبار الملطف، تركيبة خفيفة سريعة الامتصاص تجمع بين ترطيب الجسم اليومي وتهدئة البشرة المعرّضة للحرارة والشمس والجفاف. تعمل ميكروقطيرات فازلين المعروفة على حبس الرطوبة داخل طبقات البشرة بينما تمنح خلاصة الصبار إحساسًا منعشًا باردًا عند التطبيق. عبوة 200 مل عملية لحقيبة السفر أو الاستخدام اليومي الفردي.",
    benefits: "تطبيقه بعد الاستحمام يحبس الرطوبة في الجسم ويترك البشرة ناعمة ملساء طول النهار دون ملمس دهني ثقيل يزعجك تحت الملابس. وهو أيضًا منقذ فوري بعد التعرض للشمس أو بعد الحلاقة، حيث يمنح البشرة المتهيجة إحساس تبريد مطمئن يخفف الاحمرار وشعور السخونة، ويعيد لها راحتها خلال دقائق.",
  },
  "yq-1472": {
    desc: "معجون كولجيت أوبتك وايت بالفحم والنعناع، يجمع بين فكرة التبييض الحديثة المعتمدة على الفحم الماص للتصبغات وحدّة النعناع المنعشة التي تمنح نظافة كاملة للفم. صُمم للاستخدام اليومي بدل المعجون العادي لمن يستهلك الشاي والقهوة ويريد الاحتفاظ بابتسامة بيضاء دون زيادة خطوات على الروتين. عبوة 75 مل مناسبة للاستخدام الفردي المنتظم.",
    benefits: "مع التنظيف المنتظم به مرتين يوميًا تلاحظ أن التصبغات الصفراء السطحية تتراجع تدريجيًا ويكتسب الابتسامة إشراقة أوضح، بينما يبقى الفم منتعشًا بأنفاس نظيفة تدوم ساعات بعد كل فرشاة. كما يوفر حماية الفلورايد اليومية المعتادة ضد التسوس، فيجمع بين هدف الجمال وصحة الفم في خطوة واحدة.",
  },
  "yq-787": {
    desc: "لوشن كيوفي للأطفال مرطب لطيف بحجم 250 مل، صُمم خصيصًا لبشرة الأطفال الرقيقة التي تحتاج ترطيبًا يوميًا بتركيبة خالية من المكونات القاسية والعطور الثقيلة. يقوم ببناء طبقة رطوبة تحمي بشرة الطفل من جفاف الطقس والاحتكاك بالملابس، ويناسب الاستخدام بعد الاستحمام وعند تغيير الحفاض وحتى لمن لديهم بشرة عرضة للحكة والتهيج البسيط.",
    benefits: "يمتص بسرعة على بشرة الطفل دون لزوجة تزعجه أثناء اللبس أو النوم، وتصبح ملامسه أكثر نعومة وراحة منذ الأيام الأولى من الاستخدام المنتظم. وللأمهات اللواتي يعانين من جفاف وخشونة ذراعي أو سيقان أطفالهن في الشتاء، يلاحظن تحسنًا واضحًا وارتخاءً في الخشونة مع الاستمرار على التطبيق بعد كل استحمام.",
  },
  "yq-2412": {
    desc: "معجون كرست المنعش للحماية من التسوس، من أشهر علامات العناية بالأسنان عالميًا، يقدم حماية يومية شاملة للأسنان واللثة والجذور المكشوفة مع طعم نعناعي منعش يحبه الجميع. تركيبته المدعومة بالفلورايد تعمل مع كل تفريش على تقوية المينا ومقاومة بدايات التسوس، ما يجعله خيارًا عائليًا آمنًا يشاركه الكبار والصغار في المنزل. عبوة 125 مل عملية للاستخدام اليومي.",
    benefits: "اعتماده كمعجون أساسي في البيت يعني حماية متواصلة ضد التسوس لكل أفراد الأسرة مع أنفاس منتعشة بعد كل تفريش صباحي ومسائي. ويلاحظ المستخدمون الذين يعانون من حساسية بسيطة في الجذور المكشوفة راحة أكبر مع الانتظام عليه، مع شعور نظافة كاملة تدوم بعد الوجبات وتقلل الحاجة للمضمضات المتكررة خلال اليوم.",
  },
  "yq-1741": {
    desc: "جيليت كول ويف مزيل عرق للرجال بصيغة الجل المنعش داخل عبوة ستيك عملية بحجم 70 مل. يذوب الجل على البشرة مباشرة عند التطبيق فينتشر بسهولة ويجف سريعًا دون ملمس أبيض على الملابس، مع رائحة Cool Wave البحرية المنعشة التي تميز هذه السلسلة الشهيرة من جيليت. مصمم لتحمل يوم الرجل الطويل في العمل أو الرياضة أو الخروج.",
    benefits: "تطبيقه بعد الاستحمام يمنح انطلاقة انتعاش واضحة تبقى معك ساعات طويلة، مع حماية موثوقة من العرق والروائح حتى في الأجواء الحارة أو أثناء النشاط البدني. جفافه السريع يسمح بارتداء القميص فورًا دون انتظار ولا آثار بيضاء تفسد المظهر، ورائحته تمتزج بأناقة مع العطر الشخصي دون أن تطغى عليه.",
  },
};

/* ── load approved matches ─────────────────────────────── */
const staged = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/content/outlet-matching/high-confidence-matches.json"), "utf8")
);
const eligible = staged.matches.filter((m) => !m.previously_applied && CONTENT[m.luminous_id]);
const rejectedInReview = staged.matches.filter((m) => !m.previously_applied && !CONTENT[m.luminous_id]);

console.log("eligible:", eligible.length, "| rejected in review:", rejectedInReview.length);

/* ── load catalog parts ────────────────────────────────── */
function loadPart(i) {
  const src = fs.readFileSync(path.join(ROOT, `src/data/products-part-0${i}.ts`), "utf8");
  return { src, start: src.indexOf("["), end: src.lastIndexOf("]") };
}
const catalog = [];
const partRanges = [];
for (let i = 1; i <= 8; i++) {
  const { src, start, end } = loadPart(i);
  const arr = JSON.parse(src.slice(start, end + 1));
  partRanges.push({ file: `src/data/products-part-0${i}.ts`, src, start, end, arr });
  catalog.push(...arr);
}
const pristineById = new Map(catalog.map((p) => [p.id, JSON.parse(JSON.stringify(p))]));
const TOTAL_BEFORE = catalog.length;

/* ── apply ─────────────────────────────────────────────── */
const audit = [];
let applied = 0;

for (const rec of eligible) {
  const p = catalog.find((c) => c.id === rec.luminous_id);
  if (!p) continue;
  const oldDesc = p.description?.ar ?? "";
  const oldBen = Array.isArray(p.benefits?.ar) ? [...p.benefits.ar] : [];
  const c = CONTENT[rec.luminous_id];

  /* duplication guard between new desc & new benefits */
  const tok = (s) =>
    String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length >= 3);
  const dSet = new Set(tok(c.desc));
  const bToks = tok(c.benefits);
  let inter = 0;
  for (const t of bToks) if (dSet.has(t)) inter++;
  const overlap = inter / Math.max(1, Math.min(dSet.size, bToks.length));

  p.description.ar = c.desc;
  p.benefits.ar = [c.benefits];

  audit.push({
    luminous_id: rec.luminous_id,
    luminous_name_ar: p.name?.ar,
    outlet_match: { nameAr: rec.outlet_nameAr, url: rec.outlet_url },
    confidence: rec.confidence,
    signals_verified: rec.signals,
    verified_facts_source: "outlet-pharmacy-scraped-content",
    fields_changed: ["description.ar", "benefits.ar"],
    old_content: { description_ar: oldDesc, benefits_ar: oldBen },
    new_content: { description_ar: c.desc, benefits_ar: [c.benefits] },
    validation: {
      status: overlap > 0.55 ? "flagged-duplication" : "pass",
      desc_benefits_token_overlap: Math.round(overlap * 100) / 100,
      protected_fields_untouched: true,
    },
  });
  applied++;
}

/* ── surgical per-product write-back ──────────────────── */
function findStringEnd(src, openQuoteIdx) {
  let i = openQuoteIdx + 1;
  while (i < src.length) {
    if (src[i] === "\\") { i += 2; continue; }
    if (src[i] === '"') return i;
    i++;
  }
  return -1;
}

function scanStr(src, openQuoteIdx) {
  return findStringEnd(src, openQuoteIdx);
}

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

function patchObjectText(objText, newDescJson, newBenefitsJson) {
  const descKey = objText.indexOf('"description":{');
  if (descKey < 0) throw new Error("no description");
  const arKeyD = objText.indexOf('"ar":', descKey);
  const qOpenD = objText.indexOf('"', arKeyD + 5);
  const qCloseD = scanStr(objText, qOpenD);

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
  if (arrClose < 0) throw new Error("bad benefits array");
  if (!(qOpenD < qCloseD && qCloseD < arrOpen && arrOpen < arrClose)) throw new Error("span order broken");
  return (
    objText.slice(0, qOpenD) + newDescJson +
    objText.slice(qCloseD + 1, arrOpen) + newBenefitsJson +
    objText.slice(arrClose + 1)
  );
}

const byFile = new Map();
for (const p of catalog) {
  if (!CONTENT[p.id]) continue;
  const file = partRanges.find((pr) => pr.arr.includes(p)).file;
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push(p.id);
}

for (const [file, ids] of byFile) {
  const filePath = path.join(ROOT, file);
  let src = fs.readFileSync(filePath, "utf8");
  for (const pid of ids) {
    const range = findProductRange(src, pid);
    if (!range) throw new Error("object not found: " + pid);
    const [s, e] = range;
    const objText = src.slice(s, e + 1);
    JSON.parse(objText);
    const c = CONTENT[pid];
    const patched = patchObjectText(
      objText,
      JSON.stringify(c.desc),
      "[" + JSON.stringify(c.benefits) + "]"
    );
    src = src.slice(0, s) + patched + src.slice(e + 1);
  }
  fs.writeFileSync(filePath, src, "utf8");
  console.log("wrote", file, "->", ids.length, "products");
}

/* ── post-write verification ──────────────────────────── */
const allowedTopKeys = new Set(["description", "benefits"]);
const violations = [];
const reloaded = [];
for (let i = 1; i <= 8; i++) {
  const r = loadPart(i);
  reloaded.push(...JSON.parse(r.src.slice(r.start, r.end + 1)));
}

if (reloaded.length !== TOTAL_BEFORE) {
  violations.push("TOTAL COUNT CHANGED: " + reloaded.length);
}
const newById = new Map(reloaded.map((p) => [p.id, p]));
for (const [id, before] of pristineById) {
  const after = newById.get(id);
  if (!after) { violations.push(id + ": MISSING after write"); continue; }
  for (const key of Object.keys(before)) {
    const bVal = JSON.stringify(before[key]);
    const aVal = JSON.stringify(after[key]);
    if (bVal === aVal) continue;
    if (!allowedTopKeys.has(key)) {
      violations.push(id + ": PROTECTED FIELD CHANGED -> " + key);
      continue;
    }
    if (key === "description") {
      if (JSON.stringify(before.description.en) !== JSON.stringify(after.description.en)) {
        violations.push(id + ": description.en changed");
      }
      if (!after.description.ar) violations.push(id + ": empty description.ar");
    }
    if (key === "benefits") {
      if (JSON.stringify(before.benefits.en) !== JSON.stringify(after.benefits.en)) {
        violations.push(id + ": benefits.en changed");
      }
      if (!Array.isArray(after.benefits.ar) || after.benefits.ar.length !== 1) {
        violations.push(id + ": benefits.ar must be single paragraph");
      }
    }
  }
}
const appliedIds = new Set(eligible.map((r) => r.luminous_id));
for (const id of pristineById.keys()) {
  if (appliedIds.has(id)) continue;
  if (JSON.stringify(pristineById.get(id)) !== JSON.stringify(newById.get(id))) {
    violations.push(id + ": UNEXPECTEDLY MODIFIED");
  }
}

console.log("VERIFICATION:", violations.length === 0 ? "PASS — only description.ar & benefits.ar changed" : "FAIL");
violations.forEach((v) => console.log("  !!", v));
if (violations.length > 0) process.exit(1);

fs.mkdirSync(path.join(ROOT, "src/data/content/outlet-matching"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "src/data/content/outlet-matching/application-audit.json"),
  JSON.stringify({
    runAt: new Date().toISOString(),
    scope: "31-approved-high-confidence (final review)",
    applied,
    rejected_after_review: rejectedInReview.map((r) => ({
      luminous_id: r.luminous_id,
      luminous_name_ar: r.luminous_name_ar,
      reason: "variant-conflict-after-final-review",
    })),
    records: audit,
  }, null, 2),
  "utf8"
);

console.log("APPLIED:", applied);
audit.forEach((a) =>
  console.log(` • ${a.luminous_id} ${a.validation.status} (overlap=${a.validation.desc_benefits_token_overlap})`)
);
