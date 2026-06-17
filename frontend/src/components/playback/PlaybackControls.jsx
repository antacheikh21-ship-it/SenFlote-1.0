import { Play, Pause, RotateCcw, FastForward } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const SPEEDS = [1, 2, 5, 10, 30]

export default function PlaybackControls({ pb, trip }) {
  const { index, total, playing, speed, currentPosition, play, stop, reset, seek, setSpeed } = pb

  const progress = total > 1 ? index / (total - 1) : 0

  const formattedTime = currentPosition?.device_time
    ? format(new Date(currentPosition.device_time), 'HH:mm:ss', { locale: fr })
    : '--:--:--'

  return (
    <div className="flex flex-col gap-2 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-3">
      {/* ── Progress scrubber ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 w-14 text-right font-mono">{formattedTime}</span>

        <div className="relative flex-1 h-1.5 bg-slate-700 rounded-full cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pct  = (e.clientX - rect.left) / rect.width
            seek(Math.round(pct * (total - 1)))
          }}
        >
          {/* Filled track */}
          <div
            className="absolute inset-y-0 left-0 bg-brand-500 rounded-full transition-all duration-100"
            style={{ width: `${progress * 100}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progress * 100}%` }}
          />
        </div>

        <span className="text-xs text-slate-600 font-mono w-10">
          {index}/{total - 1}
        </span>
      </div>

      {/* ── Buttons row ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Reset */}
        <button
          onClick={reset}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          title="Recommencer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={playing ? stop : play}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
        >
          {playing
            ? <><Pause className="w-4 h-4" /> Pause</>
            : <><Play  className="w-4 h-4" /> Lecture</>
          }
        </button>

        {/* Speed selector */}
        <div className="flex items-center gap-1 ml-auto">
          <FastForward className="w-3.5 h-3.5 text-slate-500" />
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`
                px-2 py-0.5 text-xs rounded font-medium transition-colors
                ${speed === s
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}
              `}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Trip stats */}
        {trip && (
          <div className="hidden md:flex items-center gap-4 text-xs text-slate-500 border-l border-slate-800 pl-3 ml-1">
            <span>{trip.distance_km?.toFixed(1)} km</span>
            <span>{trip.max_speed?.toFixed(0)} km/h max</span>
            <span>{trip.duration_formatted}</span>
          </div>
        )}
      </div>
    </div>
  )
}
