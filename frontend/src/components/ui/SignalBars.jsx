/** GSM signal bars (0–5). level prop should be 0-5 or null. */
export default function SignalBars({ level }) {
  const bars = 5
  const active = level ?? 0
  return (
    <span className="flex items-end gap-px" title={`Signal GSM: ${active}/5`}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          style={{ height: `${6 + i * 2}px`, width: '3px' }}
          className={`rounded-sm ${
            i < active ? 'bg-emerald-400' : 'bg-slate-600'
          }`}
        />
      ))}
    </span>
  )
}
