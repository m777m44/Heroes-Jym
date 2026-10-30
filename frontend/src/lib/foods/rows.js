// 13.0 — shared helpers for the food-database files in this folder.

const r1 = v => Math.round(v * 10) / 10

/**
 * A food from its values per 100 g (or 100 ml): [kcal, protein, carbs, fat, sugars, sodium mg],
 * served as `g` grams of `unit`. The row keeps both — per serving for the log, per 100 g for the
 * label view. `extra` adds sizes, a preparation note, `ml`, `iraqi`, …
 */
export function per100(id, cat, name, [kcal, p, c, f, sug = 0, na = 0], unit, g, extra = {}) {
  const k = g / 100
  return {
    id, cat, name, kcal: Math.round(kcal * k), p: r1(p * k), c: r1(c * k), f: r1(f * k), unit, g,
    sug: r1(sug * k), na: Math.round(na * k), per100: { kcal, p, c, f, sug, na }, ...extra,
  }
}

/**
 * A food from its values per serving (a packet's label): [kcal, protein, carbs, fat, sugars,
 * sodium mg] — 14.0: and fibre g, when known.
 */
export function serving(id, cat, name, [kcal, p, c, f, sug = 0, na = 0, fib = null], unit, g, extra = {}) {
  const k = g > 0 ? 100 / g : 0
  return {
    id, cat, name, kcal, p, c, f, unit, g, sug, na, ...(fib != null ? { fib } : null),
    per100: g > 0 ? { kcal: Math.round(kcal * k), p: r1(p * k), c: r1(c * k), f: r1(f * k), sug: r1(sug * k), na: Math.round(na * k), ...(fib != null ? { fib: r1(fib * k) } : null) } : null,
    ...extra,
  }
}
