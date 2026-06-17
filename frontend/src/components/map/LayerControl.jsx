import { Map, Satellite } from 'lucide-react'

/**
 * Floating map layer switcher — Street vs Satellite.
 * Calls onLayerChange('street' | 'satellite').
 */
export default function LayerControl({ activeLayer, onLayerChange }) {
  const btn = (key, Icon, label) => (
    <button
      key={key}
      onClick={() => onLayerChange(key)}
      className={`
        map-control-btn
        ${activeLayer === key
          ? 'bg-brand-600 text-white shadow-md shadow-brand-900/50'
          : 'bg-slate-800/90 text-slate-400 hover:text-slate-200 hover:bg-slate-700/90'}
        border border-slate-700/60
      `}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )

  return (
    <div className="flex gap-1.5">
      {btn('street',    Map,       'Plan')}
      {btn('satellite', Satellite, 'Satellite')}
    </div>
  )
}
