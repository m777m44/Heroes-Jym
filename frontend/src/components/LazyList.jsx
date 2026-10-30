// 13.0 — long lists in pages: the first `step` rows, then the next page as the end of the list
// scrolls near the screen (IntersectionObserver — it also works inside a scrolling sheet), and a
// "Show more" button where there is no observer. A 500-row list then costs what 40 rows cost.
import { useEffect, useRef, useState } from 'react'
import { t } from '../lib/i18n.js'

/** How many of `len` rows to draw; `reset` (any value) starts again from the first page. */
export function useIncremental(len, step = 40, reset = '') {
  const [state, setState] = useState({ n: step, reset })
  const n = state.reset === reset ? state.n : step
  if (state.reset !== reset) setState({ n: step, reset })   // a new list: back to the first page
  const ref = useRef(null)
  const more = n < len
  useEffect(() => {
    const el = ref.current
    if (!el || !more || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) setState(s => ({ ...s, n: s.n + step }))
    }, { rootMargin: '0px 0px 700px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [more, n, step])
  return { n: Math.min(n, len), more, ref, showMore: () => setState(s => ({ ...s, n: s.n + step })) }
}

/** The end of a paged list: the observed marker, and the button for when there is no observer. */
export function LazyMore({ inc, left }) {
  if (!inc.more) return null
  return <div ref={inc.ref} className="lazy-more">
    <button type="button" className="btn tinted sm" onClick={inc.showMore}>{t('Show {0} more', left)}</button>
  </div>
}
