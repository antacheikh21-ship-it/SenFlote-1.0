import { useEffect, useState } from 'react'
import { Activity, Car, MapPin, WifiOff, Zap } from 'lucide-react'
import { useCounts } from '@/stores/deviceStore'
import { useDevices } from '@/hooks/useDevices'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  useDevices()
  const counts = useCounts()

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6">
      <h1 className="text-white font-bold text-xl mb-6">Tableau de bord</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Car}     label="Total véhicules"  value={counts.all}     color="bg-slate-800 text-slate-300" />
        <StatCard icon={Activity} label="En mouvement"   value={counts.moving}  color="bg-emerald-500/15 text-emerald-400" />
        <StatCard icon={Zap}     label="Au ralenti"       value={counts.idle}    color="bg-amber-500/15 text-amber-400" />
        <StatCard icon={WifiOff} label="Hors ligne"       value={counts.offline + counts.stopped} color="bg-slate-700 text-slate-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-400" />
            Répartition par statut
          </h2>
          {counts.all === 0 ? (
            <p className="text-slate-500 text-sm">Aucun véhicule enregistré.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'En mouvement', value: counts.moving,  total: counts.all, color: 'bg-emerald-500' },
                { label: 'Au ralenti',   value: counts.idle,    total: counts.all, color: 'bg-amber-500'   },
                { label: 'Arrêté',       value: counts.stopped, total: counts.all, color: 'bg-slate-500'   },
                { label: 'Hors ligne',   value: counts.offline, total: counts.all, color: 'bg-slate-700'   },
              ].map(({ label, value, total, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{label}</span>
                    <span>{value} / {total}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-500`}
                      style={{ width: total ? `${(value / total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
          <Activity className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-slate-400 text-sm font-medium">Activité récente</p>
          <p className="text-slate-600 text-xs mt-1">Disponible après réception des premières positions GPS</p>
        </div>
      </div>
    </div>
  )
}
