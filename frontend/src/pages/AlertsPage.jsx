import { useEffect, useState } from 'react'
import { AlertTriangle, LogIn, LogOut, Clock } from 'lucide-react'
import api from '@/api/axios'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AlertsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/geofence-events')
      .then((r) => setEvents(r.data.data ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6">
      <h1 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        Alertes & Événements
      </h1>

      {loading ? (
        <div className="flex justify-center pt-20">
          <span className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">Aucune alerte pour le moment</p>
          <p className="text-slate-600 text-sm mt-1">
            Les entrées et sorties de zones géofencées apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-4"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                ev.event_type === 'enter'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-rose-500/15 text-rose-400'
              }`}>
                {ev.event_type === 'enter'
                  ? <LogIn className="w-4 h-4" />
                  : <LogOut className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {ev.device?.name ?? 'Véhicule inconnu'}
                  <span className="text-slate-400 font-normal">
                    {' '}{ev.event_type === 'enter' ? 'est entré dans' : 'est sorti de'}{' '}
                  </span>
                  {ev.geofence?.name ?? 'zone inconnue'}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(ev.occurred_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
