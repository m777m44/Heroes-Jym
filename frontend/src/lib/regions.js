// 15.0 — the kitchens of Iraq, city by city: Baghdad, Mosul, Tal Afar, Najaf & Karbala, Basra,
// Kurdistan, Kirkuk, Anbar and the south. The new dishes carry their place (`rg`, lib/foods/
// iraq15.js); the older ones that clearly belong to a place are listed here by item (RG_OF).
//
//   REGIONS        key, name, a line about its kitchen, the photo of its card and its colour
//   regionOf(x)    the region key of a kitchen item (or a food), or ''
export const REGIONS = [
  { key: 'baghdad', name: 'Baghdad', ph: 'masgouf', color: '#e0a526',
    about: 'Masgouf by the Tigris, kubba Halab, baqilla and kahi with geymar for breakfast — and moota and azbari from the summer carts.' },
  { key: 'mosul', name: 'Mosul', ph: 'kubbamosul', color: '#3d8bfd',
    about: 'Kubba as big as a plate, burda pilaf, qoulat, tashreeb guss and the sweets of the old city: kleicha, khfeefi and mann al-sama.' },
  { key: 'talafar', name: 'Tal Afar', ph: 'zingil', color: '#b5651d',
    about: 'The Turkmen kitchen of Tal Afar: zingil kebab, ayran ashi, breads of barley, corn and herbs — and figs and pomegranates from its orchards.' },
  { key: 'najaf', name: 'Najaf & Karbala', ph: 'qeema', color: '#2fb380',
    about: 'Qeema and harissa cooked for the visitors, fesenjoon, the amber rice of Mishkhab — and a box of dahina to take home.' },
  { key: 'basra', name: 'Basra', ph: 'mutabbaqsamak', color: '#14a3c7',
    about: 'The fish of the Shatt al-Arab and the Gulf — sbour, zubaidi, shrimp — masmouta on Eid morning, mutabbaq, qubbut and shibzi.' },
  { key: 'kurdistan', name: 'Kurdistan', ph: 'dolmawhite', color: '#e8553e',
    about: 'Erbil, Sulaymaniyah and Duhok: white dolma with yogurt, kulana and nan tiri, Erbil kebab, kangar from the mountains, dew and mastaw.' },
  { key: 'kirkuk', name: 'Kirkuk', ph: 'sulukebabi', color: '#8e6fd8',
    about: 'Turkmen, Kurdish and Arab kitchens at one table: sulu kebabi, pacha with sumac, dolma of every vegetable and Turkmen soups.' },
  { key: 'anbar', name: 'Anbar', ph: 'kebabfallujah', color: '#c9862b',
    about: 'Fallujah kebab on the road west, and the dulaimiya — lamb, rice and bread — for guests.' },
  { key: 'south', name: 'The south & the marshes', ph: 'tabag', color: '#3aa76d',
    about: 'Nasiriyah, Amarah and the marshes: buffalo geymar, rice bread (tabag) and river fish — and shabbout from the grill.' },
]
export const REGION_BY_KEY = Object.fromEntries(REGIONS.map(r => [r.key, r]))

/** Older items that belong to a place (kind:id → region). */
export const RG_OF = {
  // Baghdad
  'F:masgouf': 'baghdad', 'F:masgoufplate': 'baghdad', 'R:masgouf': 'baghdad', 'F:kubbahalab': 'baghdad', 'R:kubbahalab': 'baghdad',
  'F:baqilla': 'baghdad', 'R:baqilla': 'baghdad', 'F:tbit': 'baghdad', 'F:kahi': 'baghdad', 'F:kahisyrup': 'baghdad', 'F:sharbatzbib': 'baghdad',
  'D:zbeeb': 'baghdad', 'F:timmanbagilla': 'baghdad', 'R:timmanbagilla': 'baghdad', 'F:laffatbagilla': 'baghdad',
  // Mosul
  'F:kubbamosul': 'mosul', 'R:kubbamosul': 'mosul', 'F:khubzdihin': 'mosul', 'F:kleicha': 'mosul', 'R:kleicha': 'mosul', 'F:kleichawalnut': 'mosul',
  'F:mannsama': 'mosul', 'F:shakarlama': 'mosul', 'F:sheikhmahshi': 'mosul', 'F:mumbar': 'mosul', 'F:kubbahamudh': 'mosul', 'R:kubbahamudh': 'mosul',
  // Tal Afar
  'F:margatalafar': 'talafar',
  // Najaf & Karbala
  'F:qeema': 'najaf', 'R:qeema': 'najaf', 'F:qeemanajaf': 'najaf', 'F:harissa': 'najaf', 'R:harissa': 'najaf', 'F:fesenjoon': 'najaf', 'F:zarda': 'najaf',
  // Basra
  'F:mutabbaqsamak': 'basra', 'R:mutabbaq': 'basra', 'F:kubbasamak': 'basra', 'F:noomibasra': 'basra', 'D:noomibasra': 'basra', 'R:fishtamarind': 'basra',
  'F:barhi': 'basra',
  // Kurdistan
  'D:mastaw': 'kurdistan',
  // the south
  'F:geymar': 'south', 'F:shabbout': 'south',
}

/** The region of a kitchen item ({uid, rg?}) or of a food ({id, rg?}), or ''. */
export function regionOf(x) {
  if (!x) return ''
  if (x.rg) return x.rg
  const uid = x.uid || (x.id ? 'F:' + x.id : '')
  return RG_OF[uid] || ''
}
