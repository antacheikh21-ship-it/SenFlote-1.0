import useDeviceStore, { useCounts } from '@/stores/deviceStore'

const FILTERS = [
  { key: 'all',     label: 'Tous',       color: 'text-slate-300',  active: 'bg-slate-700 text-white' },
  { key: 'moving',  label: 'En route',   color: 'text-emerald-400', active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { key: 'idle',    label: 'Au ralenti', color: 'text-amber-400',   active: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { key: 'offline', label: 'Hors ligne', color: 'text-slate-500',   active: 'bg-slate-700/80 text-slate-400 border-slate-600' },
]

export default function StatusFilter() {
  const counts       = useCounts()
  const statusFilter = useDeviceStore((s) => s.statusFilter)
  const setFilter    = useDeviceStore((s) => s.setStatusFilter)

  return (
    <div className="flex gap-1.5 flex-wrap">
      {FILTERS.map(({ key, label, active }) => {
        const count   = counts[key] ?? 0
        const isActive = statusFilter === key
        return (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border
              transition-all duration-150 select-none
              ${isActive
                ? `${active} border-current`
                : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'}
            `}
          >
            {label}
            <span className={`text-[10px] px-1 py-0 rounded font-semibold ${isActive ? 'bg-white/10' : 'bg-slate-800'}`}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
