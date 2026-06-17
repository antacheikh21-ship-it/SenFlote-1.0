/** Battery level indicator (0–100). */
export default function BatteryBar({ level }) {
  const pct = level ?? 0
  const color =
    pct > 60 ? 'bg-emerald-400' :
    pct > 25 ? 'bg-amber-400'   : 'bg-rose-500'

  return (
    <span className="flex items-center gap-1" title={`Batterie: ${pct}%`}>
      <span className="relative w-6 h-3 border border-slate-500 rounded-sm overflow-hidden flex items-center">
        <span
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </span>
      {/* Nub */}
      <span className="w-0.5 h-1.5 bg-slate-500 rounded-full" />
    </span>
  )
}
