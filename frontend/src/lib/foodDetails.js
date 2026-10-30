// 14.0 — the details of a food or drink beyond its calories: kilojoules, how filling it is for
// its calories, protein per 100 kcal, the minutes of walking or running that burn it, the tags
// (Iraqi, gym friendly, high protein, light, high fibre, very sweet, salty, caffeine, zero sugar)
// and the allergens its name suggests. Plain functions on an item ({ kcal, p, c, f, sug, na, fib,
// caf, iq, fit, cat, name }) — no data loaded, so the food card can use them cheaply.
const r1 = v => Math.round((+v || 0) * 10) / 10

/** Good for the gym: flagged as a healthy meal, or lean — a third of the calories from protein, not a sweet or a snack. */
export const isFit = f => !!f && (!!f.fit || (f.p >= 15 && f.kcal > 0 && f.p * 4 / f.kcal >= 0.3 && f.kcal <= 700 && !['snacks', 'sweets', 'fast', 'cakes', 'canned'].includes(f.cat)))

/** Energy in kilojoules. */
export const kJ = kcal => Math.round((+kcal || 0) * 4.184)
/** How filling for its calories: kcal per 100 g → low (< 150), medium, high (≥ 400). */
export function densityOf(kcal100) {
  if (!(kcal100 >= 0)) return null
  return kcal100 < 150 ? 'low' : kcal100 < 400 ? 'medium' : 'high'
}
/** Grams of protein per 100 kcal — over 6 is a lean, high-protein food. */
export const proteinPer100kcal = x => (x && x.kcal > 0 ? r1(x.p / x.kcal * 100) : 0)
/** Minutes of walking (≈3.5 METs) and running (≈9.8 METs) that burn `kcal` for someone of `kg`. */
export function burnMinutes(kcal, kg = 70) {
  const w = Math.max(30, +kg || 70)
  const per = met => met * 3.5 * w / 200   // kcal a minute
  return { walk: Math.max(1, Math.round(kcal / per(3.5))), run: Math.max(1, Math.round(kcal / per(9.8))), cycle: Math.max(1, Math.round(kcal / per(7.5))) }
}

// "may contain" hints from the name — a reminder to check the label, not a promise
const ALLERGENS = [
  { key: 'gluten', name: 'Gluten (wheat)', re: /\b(bread|samoon|khubz|toast|pasta|macaroni|spaghetti|noodle|indomie|ramen|cake|biscuit|cookie|cracker|croissant|pastry|pie|pizza|burger|sandwich|wrap|kubba|kibbeh|bulgur|burghul|freekeh|semolina|flour|couscous|kaak|kahi|baklava|kunafa|kleicha|maamoul|manakish|lahm|sambusa|boorak|fatayer|sfiha|pide|simit|naan|chapati|waffle|crêpe|pancake|donut|doughnut|muffin|brownie|wafer|pretzel|churro|roll|tortilla|burrito|taco|quesadilla|lasagna|harissa|jareesh|tharid|tashreeb|fatteh|shish barak|koshari|oats)\b/i },
  { key: 'milk', name: 'Milk', re: /\b(milk|cheese|yogurt|yoghurt|laban|labneh|geymar|cream|butter|qishta|kashk|shinena|ayran|doogh|latte|cappuccino|mocha|macchiato|shake|ice cream|magnum|cornetto|pudding|muhallabia|sahlab|kinder|chocolate|alfredo|mac|halloumi|akkawi|mozzarella|cheddar|cottage|parfait|lassi|kefir|falooda|tiramisu|umm ali|halawet|fatteh|shish barak)\b/i },
  { key: 'egg', name: 'Eggs', re: /\b(egg|eggs|omelette|shakshuka|ijja|makhlama|mayonnaise|cake|muffin|pancake|waffle|crêpe|french toast|brownie|tiramisu|mousse|custard|caramel)\b/i },
  { key: 'nuts', name: 'Nuts', re: /\b(nut|nuts|almond|walnut|pistachio|cashew|hazelnut|pecan|macadamia|peanut|nutella|ferrero|baklava|kunafa|maamoul|mann|nougat|brittle|praline|muhammara|fesenjoon|kerzat|snickers|m&m)\b/i },
  { key: 'sesame', name: 'Sesame', re: /\b(sesame|tahini|rashi|halva|halawa|simit|kaak|hummus|mutabbal|simsimiya)\b/i },
  { key: 'fish', name: 'Fish & seafood', re: /\b(fish|tuna|sardine|sardines|salmon|mackerel|shrimp|prawn|masgouf|shabbout|sushi|poke|sayadieh|mutabbaq)\b/i },
  { key: 'soy', name: 'Soy', re: /\b(soy|tofu|edamame|fried rice|chow mein|pad thai|teriyaki)\b/i },
]
/** Allergens a food may contain, from its (English) name. */
export const allergensOf = x => (x ? ALLERGENS.filter(a => a.re.test(x.name)).map(a => ({ key: a.key, name: a.name })) : [])
export const ALLERGEN_NAMES = ALLERGENS.map(a => a.name)

/** Tags for an item: Iraqi, high protein, light, sugary, salty, gym, vegetarian-ish … (keys + labels). */
export function tagsOf(x) {
  if (!x) return []
  const out = []
  if (x.iq) out.push({ key: 'iraqi', name: 'Iraqi', icon: 'palm' })
  if (x.fit) out.push({ key: 'fit', name: 'Gym friendly', icon: 'dumbbell' })
  if (x.p >= 20 || (x.kcal >= 60 && x.p * 4 / x.kcal >= 0.3)) out.push({ key: 'protein', name: 'High protein', icon: 'flame' })
  if (x.kcal <= 150 && x.kind !== 'S') out.push({ key: 'light', name: 'Low calorie', icon: 'leafy' })
  if (x.fib >= 6) out.push({ key: 'fibre', name: 'High fibre', icon: 'leafy' })
  if (x.sug >= 25) out.push({ key: 'sugar', name: 'Very sweet', icon: 'candy' })
  if (x.na >= 800) out.push({ key: 'salt', name: 'Salty', icon: 'salt' })
  if (x.caf >= 50) out.push({ key: 'caffeine', name: 'Caffeine', icon: 'bolt' })
  if (x.zero) out.push({ key: 'zero', name: 'Zero sugar', icon: 'checkCircle' })
  return out
}
