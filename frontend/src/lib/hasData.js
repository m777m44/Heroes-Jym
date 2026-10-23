// Whether a state holds anything a person entered. 9.0 (review on PR #11): every log counts —
// a profile with only food, fasting, health, water or drinks in it is not "empty", so signing
// in or linking a backup never replaces it without asking, and the automatic on-device
// versions (backups.js) keep a copy of it too. A leaf module with no imports, so the store,
// cloud sync and the backups (which must not import the store) share the one definition.
export const DATA_LISTS = ['workouts', 'routines', 'bodyweight', 'customEx', 'customFoods', 'meds', 'intervals', 'myDrinks']
export const DATA_MAPS = ['steps', 'water', 'waterMl', 'food', 'health', 'medLog', 'drinkLog']
const filled = v => (Array.isArray(v) ? v.length > 0 : !!v && typeof v === 'object' && Object.keys(v).length > 0)
export const hasData = st => !!st && (
  DATA_LISTS.some(k => filled(st[k])) || DATA_MAPS.some(k => filled(st[k])) ||
  filled(st.fasting && st.fasting.log) || !!(st.fasting && st.fasting.active) || filled(st.breathe && st.breathe.log) ||
  filled(st.planner && st.planner.blocks) || !!(st.profile && st.profile.name))
