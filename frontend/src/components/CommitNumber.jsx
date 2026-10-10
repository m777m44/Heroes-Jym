import { useEffect, useState } from 'react'
import { NumberField } from './ui.jsx'

// A NumberField that keeps what you type locally and only commits (validated) on blur or
// Enter. For bounded values like height or stride: committing every keystroke would reject
// the "1" and "17" on the way to "175" and wipe the field mid-typing.
export default function CommitNumber({ value, onCommit, ...rest }) {
  const [v, setV] = useState(value)
  useEffect(() => { setV(value) }, [value])
  const commit = () => { if ((v ?? null) !== (value ?? null)) onCommit(v ?? null) }
  return (
    <span onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }} style={{ display: 'contents' }}>
      <NumberField value={v} onChange={setV} nullable decimal={false} {...rest} />
    </span>
  )
}
