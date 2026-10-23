// The in-app notification bar. 9.0: a themed card that springs up, an icon, the message and a
// thin accent line that runs out while it is shown; tap it to dismiss. Same API: ui.toast(msg).
import { useEffect, useState } from 'react'
import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'

const EMOJI = /^\p{Extended_Pictographic}/u
export default function Toast() {
  const msg = useUI(s => s.toastMsg)
  const [shown, setShown] = useState('')   // keeps the text while the bar slides away
  const [k, setK] = useState(0)
  useEffect(() => { if (msg) { setShown(msg); setK(x => x + 1) } }, [msg])
  const text = msg || shown
  const ownIcon = EMOJI.test(text)
  return <div id="toast" className={msg ? 'show' : ''} role="status" aria-live="polite" onClick={() => useUI.setState({ toastMsg: '' })}>
    {!ownIcon && <span className="tst-ic" key={'i' + k}><Icon name="checkCircle" /></span>}
    <span className="tst-t" dir="auto">{text}</span>
    {msg && <i className="tst-bar" key={'b' + k} aria-hidden="true" />}
  </div>
}
