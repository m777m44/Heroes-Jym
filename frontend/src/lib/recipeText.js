// 9.0 — recipe steps as small templates, shared by the drinks library (lib/drinks.js) and the
// kitchen (lib/kitchen.js). A step is either a plain sentence (a t() key) or an array
// [template, ...args]; the template says how each argument is shown:
//   m  minutes        → "5 min"            h  hours  → "8 h"
//   n  a plain number → "200"              l  a list of ingredient ids → "spinach, apple and ginger"
// So "Blend until smooth: {0}." is translated once and works for every drink, and an
// ingredient list after a colon never needs grammatical cases in any language.
import { t, U, dateLocale, getLang } from './i18n.js'

export const TPL = {
  // ---- drinks
  boil: ['Bring the water to a boil.', ''],
  steep: ['Pour hot water over and steep for {0}: {1}.', 'ml'],
  simmer: ['Simmer on low heat for {0}: {1}.', 'ml'],
  blend: ['Blend until smooth: {0}.', 'l'],
  blendIce: ['Add ice and blend for a few more seconds.', ''],
  mix: ['Stir together: {0}.', 'l'],
  stirIn: ['Stir in: {0}.', 'l'],
  whisk: ['Whisk until smooth and frothy: {0}.', 'l'],
  shake: ['Shake well in a closed bottle: {0}.', 'l'],
  chop: ['Cut into pieces: {0}.', 'l'],
  wash: ['Wash well: {0}.', 'l'],
  peel: ['Peel and cut: {0}.', 'l'],
  slice: ['Slice thinly: {0}.', 'l'],
  grate: ['Grate finely: {0}.', 'l'],
  crush: ['Lightly crush: {0}.', 'l'],
  pit: ['Remove the stones: {0}.', 'l'],
  soak: ['Soak in water for {0}: {1}.', 'hl'],
  strain: ['Strain through a fine sieve.', ''],
  sweeten: ['Sweeten to taste, if you like: {0}.', 'l'],
  chill: ['Chill in the fridge for {0}.', 'm'],
  infuse: ['Put in a jug of cold water and leave in the fridge for {0}: {1}.', 'hl'],
  heatMilk: ['Warm the milk on low heat without letting it boil.', ''],
  thicken: ['Heat on low, stirring all the time, until it thickens.', ''],
  top: ['Top with: {0}.', 'l'],
  garnish: ['Garnish with: {0}.', 'l'],
  rest: ['Leave for {0} to thicken.', 'm'],
  sparkle: ['Top up with sparkling water just before serving.', ''],
  pierce: ['Crack or pierce the dried lime so its flavour comes out.', ''],
  brewCoffee: ['Simmer the coffee for {0}, add the cardamom and let it settle.', 'm'],
  istikan: ['Serve in small istikan glasses.', ''],
  finjan: ['Pour into small cups and serve.', ''],
  serveCold: ['Pour over ice and serve cold.', ''],
  serveHot: ['Serve hot.', ''],
  serveWarm: ['Serve warm.', ''],
  pressPom: ['Squeeze two pomegranates, or press the seeds through a sieve.', ''],
  pressCane: ['Use freshly pressed sugarcane juice.', ''],
  // ---- food (Iraqi kitchen, 9.0)
  soakFor: ['Soak for {0}, then drain well: {1}.', 'ml'],
  soakNight: ['Soak overnight: {0}.', 'l'],
  knead: ['Knead into a smooth dough: {0}.', 'l'],
  saute: ['Sauté over medium heat for {0}: {1}.', 'ml'],
  boilFor: ['Boil for {0}: {1}.', 'ml'],
  season: ['Season to taste with: {0}.', 'l'],
  marinate: ['Marinate for {0}: {1}.', 'ml'],
  skewer: ['Thread onto skewers: {0}.', 'l'],
  grillFor: ['Grill for {0}, turning often.', 'm'],
  bakeAt: ['Bake at {0} °C for {1} until golden.', 'nm'],
  layer: ['Layer in the pot or tray: {0}.', 'l'],
  serveWith: ['Serve with: {0}.', 'l'],
  riceCover: ['Add the rice and water (1 : 1.5) and cook covered on low heat for {0}.', 'm'],
  mash: ['Mash until smooth: {0}.', 'l'],
  shapeStuff: ['Shape into balls, make a hollow with your finger, fill and close.', ''],
  kubbaMosul: ['Press the dough into thin discs, fill one, cover it with another and seal the edges.', ''],
  boilGently: ['Cook in gently boiling water for {0}, until they float.', 'm'],
  addKubba: ['Drop the kubba into the simmering soup and cook for 15 minutes.', ''],
  fryShallow: ['Fry in a little oil until golden on both sides — or bake to save calories.', ''],
  masgouf: ['Split the fish along the back, open it flat and season with salt and turmeric.', ''],
  qeemaMash: ['Mash until thick and smooth, then stir in the tomato paste and spices.', ''],
  harissaBeat: ['Beat with a wooden spoon until smooth and stretchy.', ''],
  serveBowl: ['Serve hot in a bowl with some of the cooking broth.', ''],
  rollLeaves: ['Put a spoonful of filling on each leaf and roll it up tightly.', ''],
  stuffChicken: ['Fill the chicken with the stuffing and close the opening.', ''],
  patties: ['Shape into flat patties.', ''],
  foldTriangles: ['Fill the dough strips and fold them into triangles.', ''],
  kleicha: ['Roll the dough thin, spread the date paste, roll it up and slice.', ''],
}
/** Every template sentence (for the locale tests). */
export const TPL_TEXTS = Object.values(TPL).map(x => x[0])

const nf = n => (+n).toLocaleString(dateLocale())
/** "spinach, apple and ginger" in the current language. */
export function listOf(names) {
  try { return new Intl.ListFormat(dateLocale(), { style: 'long', type: 'conjunction' }).format(names) } catch { return names.join(', ') }
}
// Inside an English sentence an ingredient starts with a small letter (Arabic has no case).
// Proper names stay as they are.
const LOWER = new Set(['en'])
const PROPER = new Set(['baharat', 'arabiccoffee', 'greekyogurt', 'qamaraldin'])
function inSentence(text, id) {
  const lang = getLang()
  if (!LOWER.has(lang) || PROPER.has(id) || !text) return text
  return text.charAt(0).toLocaleLowerCase(lang) + text.slice(1)
}
export const minText = m => t('{0} min', nf(m))
export const hourText = h => nf(h) + ' ' + U('h')

/**
 * One step as a sentence. `name(id)` gives an ingredient's display name (already translated).
 * Unknown templates fall back to the raw key so a typo shows up in review, not as a crash.
 */
export function stepText(step, name) {
  if (typeof step === 'string') return t(step)
  if (!Array.isArray(step) || !step.length) return ''
  const [k, ...args] = step
  const tp = TPL[k]
  if (!tp) return String(k)
  const [text, kinds] = tp
  const vals = args.map((a, i) => {
    const kind = kinds[i] || 'n'
    if (kind === 'l') return listOf((Array.isArray(a) ? a : [a]).map(id => inSentence(name(id), id)))
    if (kind === 'm') return minText(a)
    if (kind === 'h') return hourText(a)
    return nf(a)
  })
  return t(text, ...vals)
}

// ---- amounts: "250 ml", "1 tbsp", "½ cup" ------------------------------------------------------
const FRAC = [[0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾']]
/** 1.5 → "1½", 0.25 → "¼", 2 → "2", 2.3 → "2.3" */
export function amountText(a) {
  const n = +a || 0
  const whole = Math.floor(n + 1e-9)
  const rest = n - whole
  if (rest < 0.01) return nf(whole)
  const f = FRAC.find(([v]) => Math.abs(v - rest) < 0.02)
  if (f) return (whole ? nf(whole) : '') + f[1]
  return nf(Math.round(n * 10) / 10)
}
// household units — "{0} tsp" style so no language needs plural forms after a number
export const UNIT_KEYS = {
  tsp: '{0} tsp', tbsp: '{0} tbsp', cup: '{0} cup', piece: '{0} pc', handful: '{0} handful', pinch: '{0} pinch',
  stick: '{0} stick', pod: '{0} pod', bag: '{0} bag', slice: '{0} slice', scoop: '{0} scoop',
}
/** "1 tbsp", "250 ml", "30 g" */
export function qtyText(amount, unit) {
  if (unit === 'g' || unit === 'ml') return nf(Math.round(amount * 10) / 10) + ' ' + U(unit)
  const k = UNIT_KEYS[unit]
  return k ? t(k, amountText(amount)) : amountText(amount) + ' ' + unit
}
