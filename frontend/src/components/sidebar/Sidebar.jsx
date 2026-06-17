import { ChevronLeft, Radio, Satellite } from 'lucide-react'
import useDeviceStore, { useCounts } from '@/stores/deviceStore'
import SearchBar from './SearchBar'
import StatusFilter from './StatusFilter'
import VehicleList from './VehicleList'

export default function Sidebar() {
  const open         = useDeviceStore((s) => s.sidebarOpen)
  const toggle       = useDeviceStore((s) => s.toggleSidebar)
  const counts       = useCounts()
  const totalCount   = counts.all
  const movingCount  = counts.moving

  return (
    <>
      {/* ── Sidebar panel ─────────────────────────────────────────────── */}
      <aside
        className={`
          relative flex flex-col h-full bg-slate-900 border-r border-slate-800
          transition-all duration-300 ease-in-out z-10
          ${open ? 'w-72' : 'w-0 overflow-hidden'}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600 text-white">
              <Satellite className="w-4 h-4" />
            </span>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">SenFlote</h1>
              <p className="text-[10px] text-slate-500 leading-tight">Live Tracking</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
            <Radio className="w-3 h-3 pulse-dot" />
            <span className="font-medium">{movingCount} live</span>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="px-3 py-3 space-y-2.5 border-b border-slate-800 flex-shrink-0">
          <SearchBar />
          <StatusFilter />
        </div>

        {/* Vehicle count label */}
        <div className="px-4 py-2 flex-shrink-0">
          <p className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">
            {totalCount} véhicule{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto sidebar-scroll px-3 pb-4">
          <VehicleList />
        </div>
      </aside>

      {/* ── Collapse toggle tab ────────────────────────────────────────── */}
      <button
        onClick={toggle}
        className="
          absolute left-0 top-1/2 -translate-y-1/2 z-20
          flex items-center justify-center w-5 h-10
          bg-slate-800 border border-slate-700 rounded-r-lg
          text-slate-400 hover:text-slate-200 hover:bg-slate-700
          transition-all duration-200 shadow-lg
        "
        style={{ left: open ? '288px' : '0px' }}
        aria-label={open ? 'Masquer la sidebar' : 'Afficher la sidebar'}
      >
        <ChevronLeft
          className={`w-3 h-3 transition-transform duration-300 ${open ? '' : 'rotate-180'}`}
        />
      </button>
    </>
  )
}
