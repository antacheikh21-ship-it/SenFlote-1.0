import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Gauge, Zap, ZapOff, Clock, CreditCard } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import SignalBars from '@/components/ui/SignalBars'
import BatteryBar from '@/components/ui/BatteryBar'

export default function VehiclePopup({ device }) {
  const lastSeen = device.last_seen_at
    ? formatDistanceToNow(new Date(device.last_seen_at), { locale: fr, addSuffix: true })
    : 'jamais'

  return (
    <div className="font-sans text-white select-none" style={{ minWidth: 240 }}>
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-slate-700/60"
        style={{ background: 'linear-gradient(135deg, #0f2340 0%, #0d1b2e 100%)' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-base leading-tight text-white">{device.name}</p>
            {device.plate_number && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-slate-700/60 rounded text-xs font-mono text-slate-300">
                <CreditCard className="w-3 h-3 text-slate-400" />
                {device.plate_number}
              </span>
            )}
          </div>
          <StatusBadge status={device.status} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-4 py-3 bg-slate-900 space-y-2.5">
        {/* Speed */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Gauge className="w-3.5 h-3.5" />
            Vitesse
          </span>
          <span className={`text-sm font-bold ${device.status === 'moving' ? 'text-emerald-400' : 'text-slate-300'}`}>
            {Math.round(device.last_speed ?? 0)}
            <span className="text-xs font-normal text-slate-500 ml-0.5">km/h</span>
          </span>
        </div>

        {/* Ignition */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            {device.ignition ? (
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <ZapOff className="w-3.5 h-3.5" />
            )}
            Moteur
          </span>
          <span className={`text-xs font-semibold ${device.ignition ? 'text-amber-400' : 'text-slate-500'}`}>
            {device.ignition ? 'ALLUMÉ' : 'ÉTEINT'}
          </span>
        </div>

        {/* Last activity */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            Dernière activité
          </span>
          <span className="text-xs text-slate-300">{lastSeen}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800" />

        {/* Signal + Battery */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <SignalBars level={device.gsm_signal} />
            <span>GSM</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <BatteryBar level={device.battery_level} />
            <span>{device.battery_level ?? '—'}%</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 py-2.5 bg-slate-950 flex gap-2">
        <button className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-brand-600 hover:bg-brand-500 transition-colors text-white">
          Trajet en cours
        </button>
        <button className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300">
          Historique
        </button>
      </div>
    </div>
  )
}
