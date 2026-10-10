import { exName, exNameEn, useLang } from '../lib/i18n.js'

// An exercise's name in the UI language. In Arabic it's the Arabic name with the original
// English one in small type under it (the name people see on gym posters and videos); in
// English — or for a custom exercise with no translation — just the one name.
export default function ExName({ ex, fallback = '', className = '', style }) {
  useLang()
  const main = exName(ex) || fallback
  const en = exNameEn(ex)
  if (!en) return <span className={className} style={style}>{main}</span>
  return <span className={'exn ' + className} style={style}>
    <span className="exn-main">{main}</span>
    <span className="exn-en" dir="ltr" lang="en">{en}</span>
  </span>
}
