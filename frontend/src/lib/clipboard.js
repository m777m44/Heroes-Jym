// Copy text: the async Clipboard API (secure contexts — the app and https), else the old
// select-and-copy trick. Resolves true when it worked.
export async function copyText(text) {
  const s = String(text == null ? '' : text)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(s); return true }
  } catch { /* fall through */ }
  try {
    if (typeof document === 'undefined') return false
    const ta = document.createElement('textarea')
    ta.value = s; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    const ok = document.execCommand && document.execCommand('copy')
    ta.remove()
    return !!ok
  } catch { return false }
}
