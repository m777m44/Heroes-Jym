// 7.0 — a spoken countdown for the rest timer ("3… 2… 1…") in the app's language.
// Native: @capacitor-community/text-to-speech (WebView has no speechSynthesis on most phones).
// Browser: window.speechSynthesis. Neither available → silent; the timer's beep still plays.
import { MOBILE } from './mobile.js'
import { getLang } from './i18n.js'

// BCP-47 tags the engines know; Arabic is read as Arabic numbers.
const TAG = { en: 'en-US', ar: 'ar-SA', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', nl: 'nl-NL', tr: 'tr-TR', pl: 'pl-PL', ru: 'ru-RU', ja: 'ja-JP', zh: 'zh-CN', ko: 'ko-KR', id: 'id-ID', fa: 'fa-IR', ur: 'ur-PK', hi: 'hi-IN', sv: 'sv-SE', uk: 'uk-UA' }
export const voiceTag = (lang = getLang()) => TAG[lang] || TAG[String(lang).slice(0, 2)] || 'en-US'

let tts = null
export async function speak(text, { rate = 1.05, lang } = {}) {
  const tag = voiceTag(lang)
  if (MOBILE) {
    try {
      if (!tts) tts = await import('@capacitor-community/text-to-speech')
      await tts.TextToSpeech.speak({ text: String(text), lang: tag, rate, pitch: 1, volume: 1, category: 'ambient' })
      return true
    } catch { /* engine missing or language not installed → try the web API */ }
  }
  try {
    const ss = typeof window !== 'undefined' && window.speechSynthesis
    if (!ss) return false
    const u = new window.SpeechSynthesisUtterance(String(text))
    u.lang = tag
    u.rate = rate
    ss.cancel()
    ss.speak(u)
    return true
  } catch { return false }
}

/** Is there anything that can talk? (native always tries; web needs speechSynthesis) */
export const canSpeak = () => MOBILE || (typeof window !== 'undefined' && !!window.speechSynthesis)

/** The number to say at `left` seconds, or null. Only the last three seconds. */
export const countdownWord = left => (left >= 1 && left <= 3 ? String(left) : null)
