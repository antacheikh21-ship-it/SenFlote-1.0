import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Gauge, MapPin } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import SignalBars from '@/components/ui/SignalBars'
import BatteryBar from '@/components/ui/BatteryBar'
import useDeviceStore from '@/stores/deviceStore'

export default function VehicleCard({ device }) {
  const selectedId = useDeviceStore((s) => s.selectedDeviceId)
  const select     = useDeviceStore((s) => s.selectDevice)
  const isSelected = selectedId === device.uuid

  const lastSeen = device.last_seen_at
    ? formatDistanceToNow(new Date(device.last_seen_at), { locale: fr, addSuffix: true })
    : 'jamais'

  return (
    <button
      onClick={() => select(device.uuid)}
      className={`
        w-full text-left rounded-xl border px-3.5 py-3 transition-all duration-150
        ${isSelected
          ? 'bg-brand-600/20 border-brand-500/50 shadow-md shadow-brand-500/10'
          : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'}
      `}
    >
      {/* Row 1: Name + Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">{device.name}</p>
          {device.plate_number && (
            <p className="text-xs text-slate-500 font-mono mt-0.5">{device.plate_number}</p>
          )}
        </div>
        <StatusBadge status={device.status} />
      </div>

      {/* Row 2: Speed + Last seen */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2.5">
        <span className="flex items-center gap-1">
          <Gauge className="w-3.5 h-3.5" />
          <span className={`font-medium ${device.status === 'moving' ? 'text-emerald-400' : ''}`}>
            {Math.round(device.last_speed ?? 0)} km/h
          </span>
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {lastSeen}
        </span>
      </div>

      {/* Row 3: GSM + Battery */}
      <div className="flex items-center justify-between">
        <SignalBars level={device.gsm_signal} />
        <BatteryBar level={device.battery_level} />
      </div>
    </button>
  )
}
