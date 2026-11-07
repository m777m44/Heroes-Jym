// 17.0 — strong drinks (المشروبات القوية): the strong coffees (a double espresso, cold brew, a red eye,
// dalgona, affogato), the gym's drinks (pre-workout, BCAA, creatine, a mass gainer, casein before bed,
// clear whey) and the juice drinks of Iraqi shops and Ramadan tables (Rani Float, Mogu Mogu, Tang,
// Vimto) — each with its real photo. Values per usual serving, typical of the kind (the label wins);
// caffeine in lib/caffeine.js (CAF_F) so it counts in "Caffeine in your body".
//   about  one line about it (a t() key), shown in the photo viewer
import { serving } from './rows.js'

const d = (id, name, v, unit, g, about, extra = null) => serving(id, 'drinks', name, v, unit, g, { about, ...extra })

export const STRONG_17 = [
  // ---- strong coffee --------------------------------------------------------------------------------
  d('doppio', 'Double espresso (doppio)', [5, 0.3, 0.8, 0.1, 0, 8, 0], 'cup', 60,
    'Two shots of espresso in one small cup — about 125 mg of caffeine, as much as a can and a half of cola.'),
  d('coldbrew', 'Cold brew coffee', [7, 0.4, 0.4, 0.1, 0, 14, 0], 'cup', 350,
    'Coffee steeped in cold water for 12–24 hours: smooth, less bitter — and stronger than it tastes (about 155 mg of caffeine).'),
  d('redeye', 'Red eye (filter coffee with an espresso shot)', [12, 0.8, 1, 0.3, 0, 14, 0], 'mug', 350,
    'A mug of filter coffee with a shot of espresso in it — about 225 mg of caffeine. One is plenty for a day.'),
  d('dalgona', 'Dalgona coffee (whipped coffee over milk)', [175, 7.4, 23, 6.6, 21.5, 90, 0], 'glass', 250,
    'Instant coffee, sugar and hot water whipped into a thick foam and spooned over cold milk.'),
  serving('affogato', 'sweets', 'Affogato (espresso over vanilla ice cream)', [187, 3.2, 21, 10, 19, 72, 0.6], 'cup', 120,
    { about: 'A scoop of vanilla ice cream “drowned” in a hot shot of espresso — dessert and coffee in one.' }),
  // ---- the gym's drinks ----------------------------------------------------------------------------
  d('preworkout', 'Pre-workout drink (1 scoop)', [10, 0, 2.5, 0, 0, 120, 0], 'glass', 300,
    'Caffeine (about 200 mg), beta-alanine and citrulline in water, 20–30 minutes before training. One scoop a day at most, never late in the day.',
    { fit: true }),
  d('bcaa', 'BCAA drink (1 scoop)', [25, 6, 0.5, 0, 0, 40, 0], 'glass', 400,
    'Leucine, isoleucine and valine to sip during training. Enough protein in the day does the same job.', { fit: true }),
  d('creatine', 'Creatine (5 g in water)', [0, 0, 0, 0, 0, 0, 0], 'glass', 250,
    'Creatine monohydrate, 3–5 g a day at any time — the most studied supplement for strength. No calories; drink enough water.',
    { fit: true }),
  d('gainer', 'Mass gainer shake (100 g in water)', [380, 25, 65, 3, 15, 220, 2], 'shaker', 400,
    'Protein and a lot of carbohydrate for gaining weight — about as much as a full meal. With milk, add about 120 kcal per glass.',
    { fit: true }),
  d('casein', 'Casein shake (1 scoop, before bed)', [120, 24, 4, 1, 1, 150, 0], 'shaker', 300,
    'Slow milk protein that feeds the muscles through the night — a shake before sleep.', { fit: true }),
  d('clearwhey', 'Clear whey isolate (juice-like)', [90, 20, 1, 0.2, 0.5, 110, 0], 'glass', 500,
    'Whey isolate that mixes clear and light like a juice — 20 g of protein, refreshing after training.', { fit: true }),
  // ---- juice drinks of the shops and of Ramadan -----------------------------------------------------------------
  d('rani', 'Rani Float orange (with fruit pieces)', [115, 0.3, 28, 0, 27, 20, 0.5], 'can', 240,
    'The orange drink with real fruit pieces in a small can — a classic of Iraqi and Gulf corner shops.', { mk: 'drinks' }),
  d('ranipeach', 'Rani Float peach', [115, 0.3, 28, 0, 27, 20, 0.5], 'can', 240,
    'Rani Float with peach pieces — sweet, cold and best shaken before opening.', { mk: 'drinks' }),
  d('mogumogu', 'Mogu Mogu lychee (with nata de coco)', [150, 0, 37, 0, 35, 40, 0.6], 'bottle', 320,
    'The Thai juice drink with chewy coconut jelly pieces — the bottle everyone at school knows.', { mk: 'drinks' }),
  d('mogustraw', 'Mogu Mogu strawberry', [150, 0, 37, 0, 35, 40, 0.6], 'bottle', 320,
    'Strawberry Mogu Mogu with nata de coco — chew as you drink.', { mk: 'drinks' }),
  d('tang', 'Tang orange (a glass)', [95, 0, 23.5, 0, 22.5, 30, 0], 'glass', 250,
    'The orange drink powder of Ramadan tables, stirred into cold water — vitamin C, and as much sugar as a soft drink.', { mk: 'drinks' }),
  d('tangmango', 'Tang mango (a glass)', [95, 0, 23.5, 0, 22.5, 30, 0], 'glass', 250,
    'Tang in mango, made up with cold water.', { mk: 'drinks' }),
  d('vimtocordial', 'Vimto cordial (a glass)', [95, 0, 24, 0, 23.5, 15, 0], 'glass', 250,
    'The purple cordial of Ramadan in Iraq and the Gulf, mixed one part to four with cold water.', { mk: 'drinks' }),
]

/** Caffeine (mg) of the new drinks, per serving (lib/caffeine.js → CAF_F). */
export const CAF_17 = { doppio: 126, coldbrew: 155, redeye: 225, dalgona: 120, affogato: 63, preworkout: 200 }
/** Where they sit in the Kitchen: hot drinks, milk drinks (the rest are cold drinks). */
export const HOT_17 = new Set(['doppio', 'redeye'])
export const MILK_17 = new Set(['dalgona'])
/** The Kitchen's "Strong drinks" (besides every energy drink): strong coffee and the gym's drinks. */
export const STRONG_IDS = new Set(['doppio', 'coldbrew', 'redeye', 'dalgona', 'affogato', 'espresso', 'americano', 'flatwhite', 'preworkout', 'bcaa',
  'creatine', 'gainer', 'casein', 'clearwhey', 'proteinshake', 'energydrink'])
