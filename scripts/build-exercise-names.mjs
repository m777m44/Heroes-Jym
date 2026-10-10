#!/usr/bin/env node
// Builds the Arabic exercise-name pack (frontend/src/exnames/ar.js) for the 1,324 exercises of
// the bundled dataset, which only ships English names.
//
//   node scripts/build-exercise-names.mjs           # write the pack
//   node scripts/build-exercise-names.mjs --check   # fail if a word has no translation
//
// English gym names are head-final compounds — modifiers first, the movement last ("barbell
// incline bench press"); Arabic puts the movement first and the modifiers after it ("ضغط بنش
// مائل بالبار"). So a name is split into glossary phrases (longest match first), the phrase
// order is reversed, and prepositional tails ("on exercise ball", "with towel", "over a
// bench") stay at the end. Whole-name OVERRIDES cover the irregular ones. Iraqi gyms use many
// English loan words (بنش، سكوات، ديدلفت…), and the app shows the English name under the
// Arabic one, so the glossary keeps the established loan words where they are what people say.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { EXDB } = await import(pathToFileURL(join(root, 'frontend/src/lib/exercises-data.js')).href)

// ---- glossary: English phrase → Arabic (already in Arabic word order inside the phrase) ----
const G = {
  // equipment (as a leading modifier they end up last: "… بالبار")
  'olympic barbell': 'بالبار الأولمبي', 'ez barbell': 'ببار EZ', 'ez-barbell': 'ببار EZ', 'ez bar': 'ببار EZ', 'ez-bar': 'ببار EZ', 'sz-bar': 'ببار EZ',
  'barbell': 'بالبار', 'dumbbell': 'بالدمبل', 'dumbbells': 'بالدمبلز', 'cable': 'بالكابل', 'lever': 'على الجهاز', 'smith': 'على جهاز سميث',
  'smith machine': 'على جهاز سميث', 'band': 'بالمطاط', 'resistance band': 'بمطاط المقاومة', 'kettlebell': 'بالكيتل بيل', 'sled': 'على جهاز السلِد',
  'weighted': 'بالأثقال', 'bodyweight': 'بوزن الجسم', 'body weight': 'بوزن الجسم', 'assisted': 'بالمساعدة', 'medicine ball': 'بالكرة الطبية',
  'stability ball': 'على كرة التوازن', 'exercise ball': 'على كرة التمرين', 'bosu ball': 'على كرة البوسو', 'trap bar': 'ببار تراب', 'rope': 'بالحبل',
  'roller': 'بالرول', 'wheel roller': 'بعجلة البطن', 'wheel': 'العجلة', 'landmine': 'لاندماين', 't-bar': 'ببار T', 'tire': 'الإطار',
  'ball': 'بالكرة', 'machine': 'الجهاز', 'bar': 'البار', 'bars': 'المتوازي', 'towel': 'المنشفة', 'bench': 'بنش', 'benches': 'بنشين',
  'box': 'الصندوق', 'chair': 'الكرسي', 'wall': 'الحائط', 'floor': 'الأرض', 'ground': 'الأرض', 'board': 'اللوح', 'platform': 'المنصة',
  'stepbox': 'صندوق الدرج', 'ring': 'الحلقات', 'rings': 'الحلقات', 'pulley': 'البكرة', 'straps': 'الأحزمة', 'strap': 'الحزام',
  'stirrups': 'المقابض', 'handle': 'المقبض', 'pad': 'الوسادة', 'cage': 'القفص', 'v-bar': 'بار V', 'arm blaster': 'آرم بلاستر',
  'rope attachment': 'ملحق الحبل', 'attachment': 'الملحق', 'equipment': 'معدات', 'gripper': 'مقوّي القبضة', 'battling ropes': 'حبال المعركة',
  'stationary bike': 'دراجة ثابتة', 'elliptical machine': 'جهاز الإهليلجي', 'stepmill machine': 'جهاز الدرج', 'skierg machine': 'جهاز التزلج',
  'upper body ergometer': 'دراجة الذراعين', 'treadmill': 'جهاز المشي', 'bike': 'دراجة', 'balance board': 'لوح التوازن', 'captains chair': 'كرسي الكابتن',
  'trainer': 'المدرّب', 'cambered': 'المقوّس',

  // movements (heads)
  'bench press': 'ضغط بنش', 'press': 'ضغط', 'presses': 'ضغط', 'shoulder press': 'ضغط أكتاف', 'military press': 'ضغط عسكري',
  'overhead press': 'ضغط فوق الرأس', 'chest press': 'ضغط صدر', 'floor press': 'ضغط أرضي', 'leg press': 'ضغط أرجل', 'arnold press': 'ضغط أرنولد',
  'w-press': 'ضغط W', 'pin presses': 'ضغط من الدبابيس', 'jm bench press': 'ضغط JM', 'bradford press': 'ضغط برادفورد', 'bradford rocky press': 'ضغط برادفورد روكي',
  'guillotine bench press': 'ضغط بنش جيلوتين', 'skull press': 'ضغط الجمجمة', 'pallof press': 'ضغط بالوف',
  'curl': 'ثني', 'curls': 'ثني', 'curl-up': 'ثني الجذع', 'biceps curl': 'ثني بايسبس', 'bicep curl': 'ثني بايسبس', 'hammer curl': 'ثني مطرقة',
  'preacher curl': 'ثني بريتشر', 'peacher curl': 'ثني بريتشر', 'scott curl': 'ثني سكوت', 'concentration curl': 'ثني مركّز', 'wrist curl': 'ثني الرسغ',
  'leg curl': 'ثني الأرجل', 'drag curl': 'ثني سحب', 'zottman curl': 'ثني زوتمان', 'spider curl': 'ثني سبايدر', 'cross body hammer curl': 'ثني مطرقة عبر الجسم',
  'squat': 'سكوات', 'squats': 'سكوات', 'squad': 'الفخذ الأمامي', 'front squat': 'سكوات أمامي', 'hack squat': 'هاك سكوات', 'split squat': 'سكوات منقسم',
  'goblet squat': 'سكوات جوبلت', 'sumo squat': 'سكوات سومو', 'zercher squat': 'سكوات زيرشر', 'jefferson squat': 'سكوات جيفرسون', 'sissy squat': 'سيسي سكوات',
  'pistol squat': 'سكوات المسدس', 'jump squat': 'سكوات بالقفز', 'overhead squat': 'سكوات فوق الرأس', 'cossack squat': 'سكوات القوزاق',
  'deadlift': 'رفعة ميتة', 'romanian deadlift': 'رفعة ميتة رومانية', 'sumo deadlift': 'رفعة ميتة سومو', 'stiff leg deadlift': 'رفعة ميتة بأرجل مستقيمة',
  'straight leg deadlift': 'رفعة ميتة بأرجل مستقيمة', 'row': 'تجديف', 'upright row': 'تجديف عمودي', 'pendlay row': 'تجديف بندلاي', 'renegade row': 'تجديف المتمرد',
  'fly': 'تفتيح', 'flyes': 'تفتيح', 'reverse fly': 'تفتيح عكسي', 'revers fly': 'تفتيح عكسي', 'raise': 'رفع', 'raises': 'رفع',
  'lateral raise': 'رفرفة جانبية', 'front raise': 'رفع أمامي', 'calf raise': 'رفع السمانة', 'leg raise': 'رفع الأرجل', 'knee raise': 'رفع الركبتين',
  'y-raise': 'رفع Y', 't-raise': 'رفع T', 'extension': 'مدّ', 'triceps extension': 'مدّ ترايسبس', 'tricep extension': 'مدّ ترايسبس',
  'back extension': 'مدّ الظهر', 'leg extension': 'مدّ الأرجل', 'hip extension': 'مدّ الورك', 'hyperextension': 'مدّ الظهر العكسي',
  'pulldown': 'سحب للأسفل', 'lat pulldown': 'سحب علوي', 'lateral pulldown': 'سحب علوي', 'pushdown': 'دفع للأسفل', 'pullover': 'بول أوفر',
  'push-up': 'تمرين الضغط', 'push up': 'تمرين الضغط', 'pull-up': 'عقلة', 'pull up': 'عقلة', 'pull-ups': 'عقلة', 'chin-up': 'عقلة بقبضة سفلية',
  'chin-ups': 'عقلة بقبضة سفلية', 'chin up': 'عقلة بقبضة سفلية', 'muscle-up': 'مسل أب', 'muscle up': 'مسل أب', 'dip': 'ديبس', 'dips': 'ديبس',
  'dip-pull-up': 'ديبس وعقلة', 'l-pull-up': 'عقلة L', 'crunch': 'كرنش', 'crunches': 'كرنش', 'sit-up': 'تمرين الجلوس', 'sit up': 'تمرين الجلوس',
  'plank': 'بلانك', 'lunge': 'لانج', 'shrug': 'هز الكتفين', 'kickback': 'ركلة خلفية', 'kickbacks': 'ركلة خلفية', 'twist': 'لف الجذع',
  'twists': 'لف الجذع', 'russian twist': 'اللفة الروسية', 'bridge': 'جسر', 'glute bridge': 'جسر الألوية', 'hip thrust': 'دفع الورك', 'thrusts': 'دفعات',
  'stretch': 'إطالة', 'rollerout': 'تدحرج', 'rollerer': 'تدحرج', 'fallout': 'فول أوت', 'good morning': 'جود مورنينج', 'clean': 'كلين',
  'clean and press': 'كلين وضغط', 'clean and jerk': 'كلين ونتر', 'snatch': 'خطف', 'jerk': 'نتر', 'swing': 'أرجحة', 'thruster': 'ثراستر',
  'burpee': 'بيربي', 'step-up': 'صعود الدرجة', 'step up': 'صعود الدرجة', 'step': 'خطوة', 'jump': 'قفز', 'jumps': 'قفزات', 'walk': 'مشي',
  'walking': 'مشي', 'run': 'جري', 'crawl': 'زحف', 'carry': 'حمل', 'hang': 'تعلّق', 'hanging': 'معلّقاً', 'rotation': 'تدوير', 'rotate': 'تدوير',
  'circles': 'دوائر', 'toe touch': 'لمس أصابع القدم', 'kick': 'ركل', 'kicks': 'ركلات', 'march': 'سير', 'mountain climber': 'متسلّق الجبل',
  'superman': 'سوبرمان', 'windmill': 'طاحونة الهواء', 'handstand': 'وقوف على اليدين', 'planche': 'بلانش', 'back lever': 'رافعة خلفية',
  'front lever': 'رافعة أمامية', 'skull crusher': 'سكل كراشر', 'skullcrusher': 'سكل كراشر', 'lift': 'رفع', 'lifting': 'رفع', 'bend': 'انحناء',
  'bends': 'انحناءات', 'touch': 'لمس', 'tap': 'لمس', 'reach': 'مدّ اليد', 'hold': 'ثبات', 'hug': 'عناق', 'pass': 'تمرير', 'slam': 'ضرب',
  'flip': 'قلب', 'pose': 'وضعية', 'drive': 'دفع', 'push': 'دفع', 'pull': 'سحب', 'pull-in': 'سحب للداخل', 'pull through': 'سحب من بين الأرجل',
  'tuck': 'ضم', 'squeeze': 'عصر', 'adduction': 'تقريب', 'abduction': 'تبعيد', 'flexion': 'ثني', 'pronation': 'كبّ', 'supination': 'بسط',
  'tilt': 'إمالة', 'climb': 'تسلّق', 'sprint': 'عدْو سريع', 'sprints': 'عدْو سريع', 'hops': 'قفزات خفيفة', 'slide': 'انزلاق', 'swimmer': 'السبّاح',
  'skier': 'المتزلج', 'jackknife': 'سكين جيب', 'jack knife': 'سكين جيب', 'v-up': 'V أب', 'v-sit': 'جلوس V', 'l-sit': 'جلوس L', 'body-up': 'رفع الجسم',
  'bottoms-up': 'رفع الحوض', 'butt-ups': 'رفع الحوض', 'inchworm': 'دودة القياس', 'dead bug': 'الحشرة الميتة', 'bear crawl': 'زحف الدب',
  'crab': 'سلطعون', 'frog': 'الضفدع', 'wipers': 'المسّاحات', 'scissor': 'المقص', 'flutter kicks': 'ركلات رفرفة', 'star': 'النجمة',
  'spell caster': 'ساحر', 'sphinx': 'أبو الهول', 'cobra': 'الكوبرا', 'upward facing dog': 'الكلب المتجه للأعلى', 'butterfly yoga pose': 'وضعية الفراشة',
  'world greatest stretch': 'أعظم إطالة', 'farmers walk': 'مشية المزارع', 'battling': 'حبال', 'skater hops': 'قفزات المتزلج', 'stride': 'خطوة',
  'iron cross': 'الصليب الحديدي', 'face pull': 'سحب للوجه', 'cuban press': 'ضغط كوبي', 'judo flip': 'قلبة الجودو', 'tate press': 'ضغط تيت',
  'thibaudeau kayak row': 'تجديف الكاياك', 'kayak row': 'تجديف الكاياك', 'potty squat': 'سكوات القرفصاء', 'turkish get up': 'النهوض التركي',
  'get up': 'نهوض', 'farmer': 'المزارع', 'catch': 'التقاط', 'release': 'إفلات', 'response': 'استجابة', 'cycle': 'دورة', 'climber': 'متسلّق',
  'clock': 'الساعة', 'cocoons': 'الشرنقة', 'curtsey': 'انحناءة', 'elevator': 'المصعد', 'stalder': 'ستالدر', 'svend press': 'ضغط سفيند',
  'swing walk': 'مشي متأرجح', 'skin the cat': 'سكن ذا كات', 'skin cat': 'سكن ذا كات', 'flag': 'العَلَم', 'human flag': 'العَلَم البشري',
  'gorilla': 'الغوريلا', 'frankenstein': 'فرانكنشتاين', 'monster walk': 'مشية الوحش', 'pirate supper': 'عشاء القرصان', 'seesaw': 'الأرجوحة',
  'figure 8': 'الرقم 8', 'hook': 'خطّاف', 'boxing': 'ملاكمة', 'jack': 'جاك', 'cat': 'القطة', 'muscle': 'عضلي', 'speed': 'سريع', 'power': 'قوة',
  'world': 'العالم', 'otis': 'أوتيس', 'gironda': 'جيروندا', 'janda': 'جاندا', 'keens': 'كينز', 'hyght': 'هايت', 'london bridge': 'جسر لندن',

  // body
  'chest': 'الصدر', 'shoulder': 'الكتف', 'shoulders': 'الأكتاف', 'triceps': 'الترايسبس', 'tricep': 'الترايسبس', 'biceps': 'البايسبس', 'bicep': 'البايسبس',
  'calf': 'السمانة', 'calves': 'السمانة', 'hip': 'الورك', 'hips': 'الوركين', 'glute': 'الألوية', 'glutes': 'الألوية', 'gluteus': 'الألوية',
  'hamstring': 'العضلة الخلفية', 'hamstrings': 'العضلات الخلفية', 'quads': 'الفخذ الأمامي', 'quad': 'الفخذ الأمامي', 'back': 'الظهر',
  'lower back': 'أسفل الظهر', 'upper back': 'أعلى الظهر', 'neck': 'الرقبة', 'wrist': 'الرسغ', 'ab': 'البطن', 'abs': 'البطن', 'abdominal': 'البطن',
  'oblique': 'الخواصر', 'delt': 'الكتف', 'deltoid': 'الكتف', 'rear delt': 'الكتف الخلفي', 'lat': 'الظهر العريض', 'lats': 'الظهر العريض',
  'forearm': 'الساعد', 'ankle': 'الكاحل', 'ankles': 'الكاحلين', 'knee': 'الركبة', 'knees': 'الركبتين', 'leg': 'الرجل', 'legs': 'الأرجل',
  'arm': 'الذراع', 'arms': 'الذراعين', 'hand': 'اليد', 'hands': 'اليدين', 'toe': 'أصابع القدم', 'heel': 'الكعب', 'elbow': 'الكوع',
  'groin': 'الفخذ الداخلي', 'spine': 'العمود الفقري', 'head': 'الرأس', 'body': 'الجسم', 'feet': 'القدمين', 'finger': 'الأصابع', 'sternum': 'القص',
  'scapula': 'لوح الكتف', 'scapular': 'لوح الكتف', 'pec': 'الصدر', 'pectoralis major': 'الصدرية الكبرى', 'rectus femoris': 'المستقيمة الفخذية',
  'piriformis': 'الكمثرية', 'adductor': 'المقرّبة', 'abductor': 'المبعّدة', 'tibialis': 'الظنبوبية', 'peroneals': 'الشظوية', 'hip flexor': 'مثنية الورك',
  'flexor': 'المثنية', 'inner thigh': 'الفخذ الداخلي', 'femoral': 'الفخذ', 'thigh': 'الفخذ', 'palm': 'الكف', 'palms': 'الكفين', 'trap': 'الترابيس',
  'traps': 'الترابيس', 'core': 'الجذع',

  // positions, grips, directions (modifiers)
  'incline': 'مائل', 'decline': 'مائل للأسفل', 'seated': 'جالساً', 'sitted': 'جالساً', 'sit': 'جلوس', 'standing': 'واقفاً', 'lying': 'مستلقياً',
  'kneeling': 'على الركبتين', 'prone': 'منبطحاً', 'supine': 'على الظهر', 'one arm': 'بذراع واحدة', 'single arm': 'بذراع واحدة', 'one leg': 'برجل واحدة',
  'single leg': 'برجل واحدة', 'two arms': 'بذراعين', 'two arm': 'بذراعين', 'two legs': 'بالرجلين', 'two leg': 'بالرجلين', 'alternate': 'بالتناوب', 'alternating': 'بالتناوب',
  'reverse': 'عكسي', 'revers': 'عكسي', 'reversed': 'عكسي', 'inverse': 'معكوس', 'inverted': 'مقلوب', 'reverse grip': 'بقبضة عكسية',
  'reverse-grip': 'بقبضة عكسية', 'close grip': 'بقبضة ضيقة', 'close-grip': 'بقبضة ضيقة', 'clean-grip': 'بقبضة الكلين', 'narrow grip': 'بقبضة ضيقة',
  'narrow': 'ضيق', 'close': 'قريب', 'wide grip': 'بقبضة واسعة', 'wide-grip': 'بقبضة واسعة', 'wide': 'واسع', 'neutral grip': 'بقبضة محايدة',
  'neutral': 'محايد', 'underhand': 'بقبضة سفلية', 'overhand': 'بقبضة علوية', 'hammer grip': 'بقبضة المطرقة', 'hammer': 'مطرقة', 'pronated': 'بقبضة علوية',
  'supinated': 'بقبضة سفلية', 'pronate-grip': 'بقبضة علوية', 'palm-in': 'بكف للداخل', 'palms down': 'بالكفين للأسفل', 'palms up': 'بالكفين للأعلى',
  'mixed grip': 'بقبضة مختلطة', 'grip': 'القبضة', 'gripless': 'بدون قبضة', 'bent over': 'منحنياً', 'bent-over': 'منحنياً', 'bent arm': 'بذراع مثنية',
  'bent knee': 'بركبة مثنية', 'bent knees': 'بركبتين مثنيتين', 'bent': 'مثني', 'straight leg': 'بأرجل مستقيمة', 'straight legs': 'بأرجل مستقيمة',
  'straight arm': 'بذراع مستقيمة', 'straight back': 'بظهر مستقيم', 'straight': 'مستقيم', 'stiff leg': 'بأرجل مستقيمة', 'stiff': 'متصلّب',
  'high': 'عالٍ', 'low': 'منخفض', 'front': 'أمامي', 'rear': 'خلفي', 'side': 'جانبي', 'lateral': 'جانبي', 'overhead': 'فوق الرأس',
  'behind head': 'خلف الرأس', 'behind neck': 'خلف الرقبة', 'behind the head': 'خلف الرأس', 'back of the head': 'خلف الرأس', 'behind': 'خلف',
  'full': 'كامل', 'half': 'نصف', 'quarter': 'ربع', 'isometric': 'ثابت', 'twisting': 'مع لف', 'twisted': 'ملتوٍ', 'rotational': 'دوراني',
  'rotary': 'دوراني', 'circular': 'دائري', 'cross': 'متقاطع', 'cross-over': 'متقاطع', 'crossover': 'متقاطع', 'crossovers': 'متقاطع',
  'cross body': 'عبر الجسم', 'across': 'عبر', 'forward': 'للأمام', 'backward': 'للخلف', 'up': 'للأعلى', 'down': 'للأسفل', 'upward': 'للأعلى',
  'horizontal': 'أفقي', 'vertical': 'عمودي', 'diagonal': 'قطري', 'parallel': 'متوازي', 'flat': 'مستوٍ', 'upper': 'علوي', 'lower': 'سفلي',
  'middle': 'متوسط', 'inner': 'داخلي', 'outer': 'خارجي', 'internal': 'داخلي', 'external': 'خارجي', 'inside': 'داخلي', 'outside': 'خارجي',
  'elevated': 'مرفوع', 'raised': 'مرفوع', 'extended': 'ممدود', 'outstretched': 'ممدود', 'supported': 'مسنود', 'suspended': 'معلّق', 'fixed': 'ثابت',
  'double': 'مزدوج', 'single': 'مفرد', 'one': 'واحد', 'two': 'اثنين', 'three': 'ثلاث', 'multiple': 'متعدد', 'unilateral': 'أحادي', 'contralateral': 'متقابل',
  'deep': 'عميق', 'short': 'قصير', 'semi': 'شبه', 'modified': 'معدّل', 'basic': 'أساسي', 'advanced': 'متقدم', 'intermediate': 'متوسط',
  'negative': 'سلبي', 'dynamic': 'ديناميكي', 'explosive': 'انفجاري', 'quick': 'سريع', 'slow': 'بطيء', 'plyo': 'بلايو', 'impossible': 'المستحيل',
  'anti gravity': 'ضد الجاذبية', 'clap': 'مع تصفيق', 'diamond': 'الماسي', 'archer': 'الرامي', 'spider': 'العنكبوت', 'donkey': 'الحمار',
  'sumo': 'سومو', 'french': 'فرنسي', 'arnold': 'أرنولد', 'military': 'عسكري', 'russian': 'روسي', 'korean': 'كوري', 'hindu': 'هندي',
  'pike': 'بايك', 'tuck planche': 'بلانش مضموم', 'straddle': 'مفتوح الرجلين', 'pelvic': 'الحوض', 'kipping': 'بالأرجحة', 'prisoner': 'السجين',
  'potty': 'القرفصاء', 'zercher': 'زيرشر', 'jm': 'JM', 'romanian': 'روماني', 'stance': 'وقفة', 'narrow stance': 'بوقفة ضيقة', 'wide stance': 'بوقفة واسعة',
  'sumo stance': 'بوقفة سومو', 'stork stance': 'بوقفة اللقلق', 'stork': 'اللقلق', 'position': 'وضعية', 'style': 'بأسلوب', 'variation': 'تنويع',
  'range': 'المدى', 'full range of motion': 'بمدى حركة كامل', 'motion': 'الحركة', 'side-to-side': 'من جانب لآخر', 'up-down': 'صعوداً وهبوطاً',
  'back and forth': 'ذهاباً وإياباً', 'forth': 'إياباً', 'around the world': 'حول العالم', 'elbow-to-knee': 'الكوع للركبة', 'leg-hip': 'الرجل والورك',
  'in and out': 'للداخل والخارج', 'in': 'للداخل', 'out': 'للخارج', 'off': 'بعيداً', 'point': 'نقطة', 'self': 'ذاتي', 'legged': 'الأرجل',
  'all fours': 'على أربع', 'stationary': 'ثابت', 'tennis': 'التنس', 'yoga': 'يوغا', 'bowling': 'البولينج', 'ski': 'التزلج', 'cuban': 'كوبي',
  'big': 'كبير', 'round': 'دائري', 'angle': 'زاوية', 'angled': 'بزاوية', 'degrees': 'درجة', 'closer': 'أقرب', 'sledge': 'المطرقة', 'sequence': 'متسلسل',
  'mixed': 'مختلط', 'flexion and extension': 'ثني ومدّ', 'hyper': 'مفرط', 'dumbbells': 'بالدمبلز', 'posterior': 'خلفي', 'pro': 'برو',
  'depresor': 'الخافضة', 'retractor': 'المقرّبة', 'twin': 'مزدوج', 'trap bar': 'ببار تراب', 'staircase': 'الدرج', 'feet': 'القدمين', 'ups': 'رفعات',
  'reps': 'تكرارات', 'left': 'يسار', 'lean': 'ميل', 'pyramid': 'هرمي', 'depth': 'عمق', 'wind': 'الريح', 'runners': 'العدّاء', 'can': 'العلبة',
  'breeding': 'التربية', 'waiter': 'النادل', 'carry': 'حمل', 'scott': 'سكوت', 'renegade': 'المتمرد', 'turkish': 'تركي', 'london': 'لندن',
  'tate': 'تيت', 'thibaudeau': 'تيبودو', 'kayak': 'كاياك', 'otis-up': 'أوتيس أب', 'glute-ham': 'الألوية والخلفية', 'stride': 'خطوة',
  'cycle': 'دورة', 'peacher': 'بريتشر', 'scapula push-up': 'ضغط لوح الكتف', 'pike-to-cobra': 'من بايك إلى كوبرا', 'cobra': 'الكوبرا',
  'walk-out': 'مشي للخارج', 'pistol': 'المسدس', 'hip lift': 'رفع الورك', 'drop': 'هبوط', 'box jump': 'قفز على الصندوق', 'step-down': 'نزول',
  'squatting': 'قرفصاء', 'start': 'بداية', 'female': '', 'male': '', 'pov': '', 'a': '', 'the': '', 'of': '', '-': '', 'v': 'V',
  'pro': 'برو', 'stabilization': 'مع تثبيت', 'jumping jack': 'قفز جاك', 'astride jumps': 'قفزات مفتوحة', 'astride': 'مفتوح',
  'tuck jump': 'قفز مضموم', 'frog jump': 'قفزة الضفدع', 'burpees': 'بيربي', 'mountain': 'الجبل', 'gravity': 'الجاذبية', 'anti': 'ضد',
  'jumping': 'قفز', 'speed squat': 'سكوات سريع', 'chest dip': 'ديبس الصدر', 'triceps dip': 'ديبس الترايسبس', 'bench dip': 'ديبس على البنش',
  'side bend': 'انحناء جانبي', 'side bent': 'انحناء جانبي', 'heel touchers': 'لمس الكعبين', 'touchers': 'لمس', 'air bike': 'الدراجة الهوائية',
  'air': 'هوائي', 'bicycle crunch': 'كرنش الدراجة', 'bicycle': 'الدراجة', 'v. 2': '(2)', 'v. 3': '(3)', 'v. 4': '(4)', 'arm slingers': 'أرجحة الذراعين',
  'slingers': 'أرجحة', 'ankle circles': 'دوائر الكاحل', 'heel': 'الكعب', 'apart': 'متباعد', 'arms apart': 'بذراعين متباعدتين', 'drag': 'سحب',
  'rocking': 'متأرجح', 'rocky': 'روكي', 'skier': 'المتزلج', 'butterfly': 'الفراشة', 'judo': 'جودو', 'middle fly': 'تفتيح متوسط',
  'captains': 'الكابتن', 'clock push-up': 'ضغط الساعة', 'deep squat': 'سكوات عميق', 'bug': 'الحشرة', 'dead': 'ميت', 'stretching': 'إطالة',
  'gorilla chin': 'عقلة الغوريلا', 'chin': 'الذقن', 'flutter': 'رفرفة', 'outer thigh': 'الفخذ الخارجي', 'groin crunch': 'كرنش الفخذ الداخلي',
  'svend': 'سفيند', 'mid': 'متوسط', 'leg pull-in': 'سحب الرجل للداخل', 'swing': 'أرجحة', 'farmers': 'المزارع', 'isometric wipers': 'مسّاحات ثابتة',
  'lean planche': 'بلانش مائل', 'seated row': 'تجديف جالساً', 'hollow': 'مجوّف', 'superman': 'سوبرمان', 'star jump': 'قفزة النجمة', 'ring dips': 'ديبس على الحلقات',
  'scissors': 'المقص', 'side plank': 'بلانك جانبي', 'front plank': 'بلانك أمامي', 'skater': 'المتزلج', 'skin': 'سكن', 'skull': 'الجمجمة', 'crusher': 'كراشر',
  'sprint': 'عدْو', 'tire flip': 'قلب الإطار', 'treadmill': 'جهاز المشي', 'elliptical': 'الإهليلجي', 'stepmill': 'جهاز الدرج', 'ergometer': 'الإرغومتر',
  'wall sit': 'جلوس على الحائط', 'wall ball': 'كرة الحائط', 'medicine': 'الطبية', 'resistance': 'المقاومة', 'stability': 'التوازن', 'bosu': 'البوسو',
  'olympic': 'أولمبي', 'rollout': 'تدحرج', 'roll': 'دحرجة', 'push-ups': 'تمرين الضغط', 'gravity': 'الجاذبية', 'hand release push-up': 'ضغط مع رفع اليدين',
  'sit-ups': 'تمرين الجلوس', 'lunges': 'لانج', 'rotations': 'تدويرات', 'kettlebells': 'بالكيتل بيلز', 'rows': 'تجديف', 'ups': 'رفعات',
  'snatch pull': 'سحب الخطف', 'high pull': 'سحب عالٍ', 'jerk': 'نتر', 'press-up': 'تمرين الضغط', 'triceps pushdown': 'دفع ترايسبس', 'tricep pushdown': 'دفع ترايسبس',
  'with': 'مع', 'on': 'على', 'over': 'فوق', 'to': 'إلى', 'and': 'و', 'from': 'من', 'into': 'إلى', 'through': 'عبر', 'against': 'على', 'between': 'بين',
  'around': 'حول', 'under': 'تحت', 'above': 'فوق', 'both': 'كلتا', 'for': 'لـ',
  'support': 'ثبات', 'zottman': 'زوتمان', 'maltese': 'مالطي', 'hack': 'هاك', 'clasped': 'بيدين متشابكتين', 'throw': 'رمي',
  'rack': 'من الحامل', 'rack pull': 'سحب من الحامل', 'balance': 'التوازن', 'upright': 'عمودي', 'bottoms': 'الحوض', 'two-one': 'اثنين-واحد',
  't': 'T', 'plus': 'بلس', 'reclining': 'مستلقٍ للخلف', 'saw': 'المنشار', 'split': 'منقسم', 'cossack': 'القوزاق', 'concentration': 'مركّز',
  'face': 'للوجه', 'floor': 'على الأرض', 'side lying': 'مستلقياً على الجنب', 'parallel grip': 'بقبضة متوازية', 'narrow parallel grip': 'بقبضة متوازية ضيقة',
  'twin handle': 'بمقبض مزدوج', 'semi squat': 'نصف سكوات', 'handstand push-up': 'ضغط الوقوف على اليدين', 'handstand push up': 'ضغط الوقوف على اليدين',
  'scapula push up': 'ضغط لوح الكتف', 'press sit-up': 'تمرين الجلوس مع ضغط', 'push sit-up': 'تمرين الجلوس مع دفع',
  'stationary bike run': 'جري على الدراجة الثابتة', 'stationary bike walk': 'مشي على الدراجة الثابتة', 'shoulder row': 'تجديف الكتف',
  'full can lateral raise': 'رفرفة جانبية بوضعية العلبة الممتلئة', 'around pullover': 'بول أوفر دائري', 'half sit-up': 'نصف تمرين الجلوس', 'high knee': 'رفع الركبة عالياً', 'high knees': 'رفع الركبتين عالياً',
  'high bar squat': 'سكوات بار عالٍ', 'low bar squat': 'سكوات بار منخفض', 'one legged': 'برجل واحدة', 'bent arms': 'بذراعين مثنيتين',
  'leg hip raise': 'رفع الرجل والورك', 'chest pad': 'وسادة الصدر', 'fixed back': 'بظهر ثابت', 'parallel bars': 'المتوازي',
  'reverse hyper': 'هايبر عكسي', 'power clean': 'باور كلين', 'walking lunge': 'لانج مع المشي', 'hang clean': 'كلين معلّق',
  '45°': '45°', '45в°': '45°', '3/4': '3/4', '180': '180', '360': '360', '45': '45', '2': '2', '3': '3', '4': '4', '8': '8',
}

// Prepositions start a tail that stays after the head in Arabic.
const PREP = new Set(['with', 'on', 'over', 'to', 'from', 'into', 'through', 'against', 'between', 'around', 'under', 'above', 'for', 'and'])

// Tails worth saying better than word by word.
const TAIL = {
  'with towel': 'بالمنشفة', 'with rope': 'بالحبل', 'with rope attachment': 'بملحق الحبل', 'rope attachment': 'بملحق الحبل', 'with v-bar': 'ببار V',
  'with arm blaster': 'مع آرم بلاستر', 'with stability ball': 'مع كرة التوازن', 'with throw down': 'مع رمي للأسفل', 'with lateral throw down': 'مع رمي جانبي',
  'on exercise ball': 'على كرة التمرين', 'on stability ball': 'على كرة التوازن', 'on bench': 'على البنش', 'on floor': 'على الأرض', 'on knees': 'على الركبتين',
  'on knee': 'على الركبة', 'on hip': 'على الورك', 'over a bench': 'فوق البنش', 'over bench': 'فوق البنش', 'over head': 'فوق الرأس', 'to press': 'مع ضغط',
  'and press': 'وضغط', 'and pullover': 'وبول أوفر', 'and jerk': 'ونتر', 'to skull press': 'إلى الجمجمة', 'on bosu ball': 'على كرة البوسو',
  'with chains': 'مع سلاسل', 'with band': 'مع مطاط', 'on wall': 'على الحائط', 'with bands': 'مع مطاط', 'on chair': 'على الكرسي', 'on box': 'على الصندوق',
  'with one leg stabilization': 'مع تثبيت رجل واحدة', 'against wall': 'على الحائط', 'between benches': 'بين بنشين', 'between chairs': 'بين كرسيين',
  'with dumbbell': 'بالدمبل', 'with dumbbells': 'بالدمبلز', 'with kettlebell': 'بالكيتل بيل', 'with barbell': 'بالبار', 'with plate': 'بقرص',
  'full range of motion': 'بمدى حركة كامل', 'behind neck': 'خلف الرقبة', 'behind head': 'خلف الرأس', 'behind the head': 'خلف الرأس',
  'with arms extended': 'مع مدّ الذراعين', 'on high parallel bars': 'على متوازي عالٍ', 'from 3 point stance': 'من وقفة ثلاثية النقاط', 'over bench': 'فوق البنش', 'over a bench': 'فوق البنش', 'on parallel bars': 'على المتوازي', 'on dip bars': 'على المتوازي', 'under both legs': 'تحت الرجلين',
}

// Irregular names, translated whole.
const OVERRIDES = {
  '3/4 sit-up': 'جلوس البطن 3/4', 'air bike': 'الدراجة الهوائية (كرنش)', 'burpee': 'بيربي', 'battling ropes': 'حبال المعركة',
  'bear crawl': 'زحف الدب', 'jumping jack': 'قفز جاك', 'mountain climber': 'متسلّق الجبل', 'balance board': 'لوح التوازن',
  'band pull through': 'سحب من بين الأرجل بالمطاط', 'barbell good morning': 'جود مورنينج بالبار', 'barbell clean and press': 'كلين وضغط بالبار',
  'barbell bench press': 'ضغط بنش بالبار', 'barbell deadlift': 'رفعة ميتة بالبار', 'barbell full squat': 'سكوات كامل بالبار', 'barbell curl': 'ثني بالبار',
  'dumbbell bench press': 'ضغط بنش بالدمبل', 'dumbbell fly': 'تفتيح بالدمبل', 'push-up': 'تمرين الضغط', 'pull-up': 'عقلة', 'chin-up': 'عقلة بقبضة سفلية',
  'sit-up': 'تمرين الجلوس', 'crunch floor': 'كرنش على الأرض', 'skin the cat': 'سكن ذا كات', 'run': 'جري', 'walking on stepmill': 'مشي على جهاز الدرج',
  'stationary bike walk': 'مشي على الدراجة الثابتة', 'stationary bike run': 'جري على الدراجة الثابتة', 'world greatest stretch': 'أعظم إطالة في العالم',
  'dumbbell rear delt row_shoulder': 'تجديف الكتف الخلفي بالدمبل', 'chest and front of shoulder stretch': 'إطالة الصدر ومقدمة الكتف',
  'push and pull bodyweight': 'دفع وسحب بوزن الجسم', 'arm slingers hanging straight legs': 'أرجحة الذراعين معلّقاً بأرجل مستقيمة',
  'arm slingers hanging bent knee legs': 'أرجحة الذراعين معلّقاً بركبتين مثنيتين', 'glute bridge two legs on bench (male)': 'جسر الألوية بالرجلين على البنش',
  'inverted row bent knees': 'تجديف مقلوب بركبتين مثنيتين', 'standing calves calf stretch': 'إطالة السمانة واقفاً',
  'exercise ball one legged diagonal kick hamstring curl': 'ثني العضلة الخلفية بركلة قطرية برجل واحدة على كرة التمرين',
  'leg up hamstring stretch': 'إطالة العضلة الخلفية مع رفع الرجل', 'cable one arm lateral bent-over': 'رفرفة جانبية منحنياً بذراع واحدة بالكابل',
  'bridge - mountain climber (cross body)': 'جسر مع متسلّق الجبل (عبر الجسم)', 'seated wide angle pose sequence': 'تسلسل وضعية الزاوية الواسعة جالساً',
}

// Adjectives agree with a feminine movement: «عقلة خلفية», «رفرفة جانبية مائلة».
const FEM_HEAD = /^(عقلة|رفرفة|ركلة|رفعة|إطالة|اللفة|لفة|قفزة|خطوة|أرجحة|مشية|وضعية|جسر الألوية_)/
const FEM = { 'خلفي': 'خلفية', 'أمامي': 'أمامية', 'جانبي': 'جانبية', 'عكسي': 'عكسية', 'مائل': 'مائلة', 'واسع': 'واسعة', 'ضيق': 'ضيقة',
  'كامل': 'كاملة', 'عالٍ': 'عالية', 'منخفض': 'منخفضة', 'داخلي': 'داخلية', 'خارجي': 'خارجية', 'مستقيم': 'مستقيمة', 'معكوس': 'معكوسة',
  'مقلوب': 'مقلوبة', 'ثابت': 'ثابتة', 'مزدوج': 'مزدوجة', 'متقاطع': 'متقاطعة', 'دوراني': 'دورانية', 'دائري': 'دائرية', 'أفقي': 'أفقية',
  'عمودي': 'عمودية', 'قطري': 'قطرية', 'متوازي': 'متوازية', 'علوي': 'علوية', 'سفلي': 'سفلية', 'متوسط': 'متوسطة', 'مفرد': 'مفردة',
  'معدّل': 'معدّلة', 'أساسي': 'أساسية', 'متقدم': 'متقدمة', 'سلبي': 'سلبية', 'سريع': 'سريعة', 'عميق': 'عميقة', 'قصير': 'قصيرة',
  'مرفوع': 'مرفوعة', 'ممدود': 'ممدودة', 'مسنود': 'مسنودة', 'معلّق': 'معلّقة', 'روسي': 'روسية', 'فرنسي': 'فرنسية', 'مالطي': 'مالطية',
  'روماني': 'رومانية', 'منقسم': 'منقسمة', 'هندي': 'هندية', 'كوري': 'كورية', 'متصلّب': 'متصلّبة', 'انفجاري': 'انفجارية', 'ديناميكي': 'ديناميكية' }
function agree(list) {
  if (!list.length || !FEM_HEAD.test(list[0])) return list
  // only bare adjectives agree — «بظهر مستقيم» describes the back, not the movement
  return list.map((c, i) => {
    if (i === 0 || /^(على|مع|من|فوق|خلف|عبر|حول|تحت)\s/.test(c)) return c
    const [w, ...rest] = c.split(' ')
    return [FEM[w] || w, ...rest].join(' ')
  })
}

const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim()
const phrases = Object.keys(G).sort((a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length)
const maxWords = Math.max(...phrases.map(p => p.split(' ').length))
const tailKeys = Object.keys(TAIL).sort((a, b) => b.length - a.length)
const unknown = new Map()
const protectedPhrases = phrases.filter(p => p.includes(' ') && p.split(' ').some(w => PREP.has(w)))

// Greedy longest-match over a word list → array of Arabic chunks (in English order).
function chunks(words, name) {
  const out = []
  for (let i = 0; i < words.length;) {
    let hit = null
    for (let n = Math.min(maxWords, words.length - i); n > 0; n--) {
      const k = words.slice(i, i + n).join(' ')
      if (k in G) { hit = [k, n]; break }
    }
    if (hit) { if (G[hit[0]]) out.push(G[hit[0]]); i += hit[1] }
    else { unknown.set(words[i], (unknown.get(words[i]) || 0) + 1); out.push(words[i]); i++ }
  }
  return out
}

function translate(en) {
  let s = norm(en)
  if (OVERRIDES[s]) return OVERRIDES[s]
  // version marks and parentheses
  let suffix = ''
  s = s.replace(/\s*v\.\s*(\d)\b/g, (_, d) => { suffix += ` (${d})`; return '' }).replace(/[,_]/g, ' ').replace(/\.(?=\s|$)/g, '')
  // known prepositional tails can sit anywhere ("dumbbell over bench one arm wrist curl")
  const early = []
  for (const k of tailKeys) {
    if (!k.includes(' ')) continue
    const re = new RegExp('(^|\\s)' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$)')
    if (re.test(s)) { early.push(TAIL[k]); s = s.replace(re, ' ') }
  }
  if (s.includes(' - ')) { const [a, ...b] = s.split(' - '); s = a + ' (' + b.join(' ').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim() + ')' }
  for (const k of protectedPhrases) if ((' ' + s + ' ').includes(' ' + k + ' ')) s = (' ' + s + ' ').replace(' ' + k + ' ', ' ' + k.replace(/ /g, '~') + ' ').trim()
  const parens = []
  s = s.replace(/\(([^)]*)\)/g, (_, inner) => { parens.push(inner.trim()); return ' ' }).replace(/\s+/g, ' ').trim()
  const words = s.split(' ').filter(Boolean).map(w => w.replace(/~/g, ' '))
  // head = words up to the first preposition; tails = the rest, one per preposition
  const segs = [[]]
  for (const w of words) { if (PREP.has(w) && segs[segs.length - 1].length) segs.push([w]); else segs[segs.length - 1].push(w) }
  const head = segs[0]
  // a leading equipment word (barbell, dumbbell, cable…) is emitted last, after the modifiers
  const headAr = agree(chunks(head, en).reverse()).join(' ')
  const tails = segs.slice(1).map(seg => {
    const key = seg.join(' ')
    for (const k of tailKeys) if (key === k) return TAIL[k]
    const [p, ...rest] = seg
    return (G[p] ? G[p] + ' ' : '') + chunks(rest, en).reverse().join(' ')
  })
  // equipment chunks start with ب / على: keep them at the very end of the head
  let parts = headAr.split(' ')
  let out = [headAr, ...tails, ...early].join(' ')
  const pAr = parens.map(p => {
    const k = norm(p)
    if (k === 'male' || k === 'female' || k === '') return ''
    if (TAIL['with ' + k.replace(/^with /, '')] && k.startsWith('with ')) return TAIL[k] || ''
    if (TAIL[k]) return TAIL[k]
    if (k === 'back pov') return 'منظر خلفي'
    if (k === 'side pov') return 'منظر جانبي'
    if (k === 'front pov') return 'منظر أمامي'
    return translate(k)
  }).filter(Boolean)
  if (pAr.length) out += ' (' + pAr.join('، ') + ')'
  void parts
  return (out + suffix).replace(/\s+/g, ' ').replace(/ \(\s*\)/g, '').trim()
}

const pack = {}
for (const e of EXDB) pack[e.id] = translate(e.n)

if (unknown.size) {
  const list = [...unknown].sort((a, b) => b[1] - a[1])
  console.error(`${list.length} word(s) without a translation:`)
  console.error(list.map(([w, n]) => `${w}(${n})`).join(' '))
  if (process.argv.includes('--check')) process.exit(1)
}

if (process.argv.includes('--check')) {
  const file = join(root, 'frontend/src/exnames/ar.js')
  const cur = readFileSync(file, 'utf8')
  if (!cur.includes(JSON.stringify(pack))) { console.error('frontend/src/exnames/ar.js is out of date — run node scripts/build-exercise-names.mjs'); process.exit(1) }
  console.log(`frontend/src/exnames/ar.js in sync (${Object.keys(pack).length} names).`)
} else {
  const dir = join(root, 'frontend/src/exnames')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'ar.js'), '// generated by scripts/build-exercise-names.mjs — do not edit\n// Arabic exercise names, by exercise id. The English name is shown underneath in the app.\nexport default ' + JSON.stringify(pack) + '\n')
  console.log(`frontend/src/exnames/ar.js: ${Object.keys(pack).length} names`)
}
if (process.argv.includes('--sample')) {
  for (const e of EXDB.filter((_, i) => i % 23 === 0)) console.log(e.n.padEnd(52), '→', pack[e.id])
}
