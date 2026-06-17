import { Search, X } from 'lucide-react'
import useDeviceStore from '@/stores/deviceStore'

export default function SearchBar() {
  const query      = useDeviceStore((s) => s.searchQuery)
  const setQuery   = useDeviceStore((s) => s.setSearchQuery)

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un véhicule…"
        className="
          w-full bg-slate-800/60 border border-slate-700 rounded-xl
          pl-9 pr-8 py-2 text-sm text-slate-200 placeholder-slate-500
          focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40
          transition-colors
        "
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
