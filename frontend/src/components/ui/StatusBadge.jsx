const CONFIG = {
  moving:  { label: 'En route',  dot: 'bg-emerald-400', text: 'text-emerald-400', ring: 'bg-emerald-400/10' },
  idle:    { label: 'Au ralenti', dot: 'bg-amber-400',   text: 'text-amber-400',   ring: 'bg-amber-400/10'   },
  stopped: { label: 'Arrêté',    dot: 'bg-rose-400',    text: 'text-rose-400',    ring: 'bg-rose-400/10'    },
  offline: { label: 'Hors ligne', dot: 'bg-slate-500',   text: 'text-slate-400',   ring: 'bg-slate-500/10'   },
}

export default function StatusBadge({ status, showLabel = true }) {
  const cfg = CONFIG[status] ?? CONFIG.offline
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.ring} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'moving' ? 'pulse-dot' : ''}`} />
      {showLabel && cfg.label}
    </span>
  )
}
