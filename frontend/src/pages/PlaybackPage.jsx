import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { fetchTrip, fetchTripPositions } from '@/api/trips'
import { usePlayback } from '@/hooks/usePlayback'
import PlaybackMap from '@/components/playback/PlaybackMap'
import PlaybackControls from '@/components/playback/PlaybackControls'

export default function PlaybackPage() {
  const { tripId } = useParams()
  const [trip,      setTrip]      = useState(null)
  const [positions, setPositions] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const pb = usePlayback(positions)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTrip(tripId), fetchTripPositions(tripId)])
      .then(([t, p]) => {
        setTrip(t)
        setPositions(p)
      })
      .catch(() => setError('Impossible de charger ce trajet.'))
      .finally(() => setLoading(false))
  }, [tripId])

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <Link
          to="/tracking"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-sm font-semibold text-white">
            Rejeu de trajet
            {trip?.device && (
              <span className="ml-2 text-slate-500 font-normal">{trip.device.name}</span>
            )}
          </h2>
          {trip && (
            <p className="text-xs text-slate-600">
              {new Date(trip.started_at).toLocaleString('fr-FR')}
            </p>
          )}
        </div>

        {/* Speed indicator during playback */}
        {pb.playing && (
          <div className="ml-auto flex items-center gap-2 text-xs text-brand-400">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 pulse-dot" />
            {pb.currentPosition?.speed?.toFixed(0) ?? 0} km/h · {pb.speed}× vitesse
          </div>
        )}
      </div>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}
        {!loading && !error && positions.length > 0 && (
          <PlaybackMap
            positions={positions}
            currentPosition={pb.currentPosition}
            playing={pb.playing}
          />
        )}
      </div>

      {/* ── Controls ────────────────────────────────────────────────────── */}
      {!loading && positions.length > 0 && (
        <PlaybackControls pb={pb} trip={trip} />
      )}
    </div>
  )
}
