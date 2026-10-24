// Quick search (8.0): one box that finds screens, tools, settings, your routines and the
// exercise library — in the app's language and in English, ignoring case, accents and Arabic
// diacritics. Pure: the sheet (components/QuickSearch.jsx) renders and acts on the results.

/** Lower case, no accents / Arabic tashkeel / tatweel, unified alef/yaa/taa marbuta. */
export function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ').trim()
}

/**
 * Score one candidate against a folded query: 100 exact, 80 starts with, 60 a word starts with,
 * 40 contains, 0 no match. Every word of the query must match somewhere.
 */
export function score(q, ...fields) {
  if (!q) return 0
  const hay = fields.map(fold).filter(Boolean)
  if (!hay.length) return 0
  const words = q.split(' ').filter(Boolean)
  let total = 0
  for (const w of words) {
    let best = 0
    for (const h of hay) {
      if (h === w) best = Math.max(best, 100)
      else if (h.startsWith(w)) best = Math.max(best, 80)
      else if (h.includes(' ' + w)) best = Math.max(best, 60)
      else if (h.includes(w)) best = Math.max(best, 40)
    }
    if (!best) return 0
    total += best
  }
  return total / words.length
}

/** Screens and tools: [title (i18n key), route, icon, tint, keywords (English, extra words)]. */
export const PLACES = [
  ['Home', '/home', 'house', 'var(--acc)', 'today start'],
  ['Plan', '/plan', 'calendar', 'var(--blue)', 'routine week schedule'],
  ['Start workout', '/start', 'play', 'var(--green)', 'train gym session'],
  ['Stats', '/stats', 'chart', 'var(--indigo)', 'progress charts records'],
  ['History', '/history', 'history', 'var(--grey)', 'past workouts log'],
  ['Library', '/library', 'dumbbell', 'var(--orange)', 'exercises'],
  ['Tools', '/tools', 'widget', 'var(--purple)', 'utilities'],
  ['My schedule', '/dayplan', 'calendar', 'var(--indigo)', 'day plan schedule school study work rest timetable routine reminders خطة يوم دراسة جدول جدولي مدرسة دوام'],
  ['Drinks & juices', '/drinks', 'cup', 'var(--green)', 'juice smoothie tea shake detox laban عصير مشروبات شاي'],
  ['Soft drinks', '/sodas', 'can', 'var(--red)', 'soda fizzy cola coke pepsi 7up sprite fanta mirinda mountain dew energy red bull monster power horse barbican malt sparkling tonic mojito غازي غازية كولا بيبسي سفن اب سبرايت ميرندا بربيكان ريد بول موهيتو'],
  ['Nuts & seeds', '/nuts', 'nut', 'var(--orange)', 'nuts pistachio peanut almond walnut cashew hazelnut seeds sunflower pumpkin watermelon kerzat chickpeas مكسرات كرزات فستق لوز جوز كاجو بندق حب شمسي رقي قرع'],
  ['Notifications', '/notifications', 'bellBadge', 'var(--orange)', 'reminders alerts notify alarm اشعارات إشعارات تنبيه تذكير'],
  ['Interval timer', '/timer', 'timer', 'var(--red)', 'tabata hiit emom stopwatch rounds boxing'],
  ['Breathe', '/breathe', 'wind', 'var(--teal)', 'breathing calm relax meditation box 4-7-8'],
  ['Fasting tracker', '/fasting', 'moon', 'var(--orange)', 'intermittent 16:8 ramadan iftar suhoor omad'],
  ['Recovery', '/recovery', 'heartPulse', 'var(--green)', 'muscles rest sore ready'],
  ['Heart-rate zones', '#zones', 'heart', 'var(--red)', 'pulse bpm cardio karvonen'],
  ['Water', '/water', 'drop', 'var(--blue)', 'drink hydration reminders'],
  ['Food & calories', '/food', 'fork', 'var(--orange)', 'meals nutrition macros protein diet'],
  ['Kitchen', '/kitchen', 'leafy', 'var(--green)', 'recipes healthy cooking'],
  ['Walking & steps', '/walk', 'figureWalk', 'var(--acc)', 'pedometer steps walk'],
  ['Burn calories', '/calories', 'flame', 'var(--red)', 'burn plan cardio'],
  ['Body weight', '/weight', 'scale', 'var(--teal)', 'weigh bmi photos'],
  ['Ideal body', '/ideal', 'person', 'var(--green)', 'ideal weight body fat goal'],
  ['Health log', '/health', 'heartPulse', 'var(--pink)', 'sleep mood blood pressure sugar medicines'],
  ['Reports', '/reports', 'chartLine', 'var(--indigo)', 'weekly monthly summary'],
  ['Settings', '/settings', 'gear', 'var(--grey)', 'preferences options'],
  ['Themes', '/themes', 'palette', 'var(--pink)', 'dark light colours appearance'],
  ['Wallpapers', '/wallpapers', 'image', 'var(--purple)', 'background'],
  ['Backups & restore', '/backups', 'cloud', 'var(--blue)', 'google drive backup restore sync export import account'],
  ['What’s new', '#whatsnew', 'sparkles', 'var(--yellow)', 'new features changelog update'],
  ['Profile', '#profile', 'personCircle', 'var(--acc)', 'name avatar me'],
]

/**
 * Search everything → [{ kind: 'place'|'routine'|'exercise'|'soda'|'nut'|'drink', title, sub, icon, tint, to?, id?, score }],
 * best first, at most `limit`. `tr` translates an i18n key; `exName(ex)`/`exSearch(ex)` come from
 * lib/i18n.js so exercise names match in the app's language too.
 */
export function search(query, { routines = [], exercises = [], items = [], tr = s => s, exName = e => e.n, exSearch = e => e.n, routineName = r => r.name, limit = 30 } = {}) {
  const q = fold(query)
  if (!q) return []
  const out = []
  for (const [title, to, icon, tint, kw] of PLACES) {
    const s = score(q, tr(title), title, kw)
    if (s) out.push({ kind: 'place', title: tr(title), icon, tint, to, score: s + 15 })
  }
  for (const r of routines || []) {
    const s = score(q, routineName(r), r.name)
    if (s) out.push({ kind: 'routine', title: routineName(r), icon: 'list', tint: 'var(--blue)', id: r.id, to: '/plan/r/' + r.id, score: s + 10 })
  }
  // 10.0: soft drinks, nuts & seeds and drinks — [{ kind, id, title, en, kw?, sub?, icon, tint }]
  for (const it of items || []) {
    const s = score(q, it.title, it.en, it.kw || '')
    if (s) out.push({ ...it, score: s + 5 })
  }
  let ex = 0
  for (const e of exercises || []) {
    const s = score(q, exSearch(e), e.tg, e.bp, e.eq)
    if (s) { out.push({ kind: 'exercise', title: exName(e), sub: e.tg, icon: 'dumbbell', tint: 'var(--orange)', id: e.id, ex: e, score: s }); ex++ }
    if (ex > 200) break
  }
  return out.sort((a, b) => b.score - a.score || a.title.length - b.title.length).slice(0, limit)
}
