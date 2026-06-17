import { useState, useCallback } from 'react'
import {
  BarChart2, Download, Loader2, FileText,
  FileSpreadsheet, AlertTriangle, Route, ParkingCircle,
} from 'lucide-react'
import {
  fetchMileageReport, fetchStopsReport, fetchSpeedingReport,
  requestExport, pollExportStatus,
} from '@/api/reports'

const REPORT_TYPES = [
  { key: 'mileage',  label: 'Kilométrage',    Icon: Route,          color: 'text-brand-400' },
  { key: 'stops',    label: "Temps d'arrêt",   Icon: ParkingCircle,  color: 'text-amber-400' },
  { key: 'speeding', label: 'Survitesse',      Icon: AlertTriangle,  color: 'text-rose-400'  },
]

const today   = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)

export default function ReportsPage() {
  const [activeType, setActiveType] = useState('mileage')
  const [dateFrom,   setDateFrom]   = useState(weekAgo)
  const [dateTo,     setDateTo]     = useState(today)
  const [rows,       setRows]       = useState([])
  const [loading,    setLoading]    = useState(false)
  const [exporting,  setExporting]  = useState(false)
  const [exportUrl,  setExportUrl]  = useState(null)

  const FETCHERS = {
    mileage:  fetchMileageReport,
    stops:    fetchStopsReport,
    speeding: fetchSpeedingReport,
  }

  const runReport = useCallback(async () => {
    setLoading(true)
    setRows([])
    setExportUrl(null)
    try {
      const data = await FETCHERS[activeType]({ date_from: dateFrom, date_to: dateTo })
      setRows(data)
    } finally {
      setLoading(false)
    }
  }, [activeType, dateFrom, dateTo])

  const startExport = useCallback(async (format) => {
    setExporting(true)
    setExportUrl(null)
    try {
      const { job_id } = await requestExport({
        type: activeType, format, date_from: dateFrom, date_to: dateTo,
      })
      // Poll until done
      const poll = async () => {
        const status = await pollExportStatus(job_id)
        if (status.status === 'done') {
          setExportUrl(status.url)
          setExporting(false)
        } else if (status.status === 'failed') {
          setExporting(false)
        } else {
          setTimeout(poll, 2000)
        }
      }
      setTimeout(poll, 2000)
    } catch {
      setExporting(false)
    }
  }, [activeType, dateFrom, dateTo])

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 flex-shrink-0">
        <BarChart2 className="w-5 h-5 text-brand-400" />
        <h1 className="text-base font-bold text-white">Rapports</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: controls ────────────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 border-r border-slate-800 p-4 space-y-5">
          {/* Report type */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Type de rapport
            </p>
            <ul className="space-y-1">
              {REPORT_TYPES.map(({ key, label, Icon, color }) => (
                <li key={key}>
                  <button
                    onClick={() => { setActiveType(key); setRows([]) }}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                      transition-colors
                      ${activeType === key
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}
                    `}
                  >
                    <Icon className={`w-4 h-4 ${activeType === key ? color : ''}`} />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Date range */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Période
            </p>
            <div className="space-y-2">
              {[['Du', dateFrom, setDateFrom], ['Au', dateTo, setDateTo]].map(([label, val, setter]) => (
                <div key={label}>
                  <label className="text-xs text-slate-500 block mb-1">{label}</label>
                  <input
                    type="date"
                    value={val}
                    max={today}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Run */}
          <button
            onClick={runReport}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
            Générer
          </button>
        </div>

        {/* ── Right: results ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Export toolbar */}
          {rows.length > 0 && (
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-800 bg-slate-900 flex-shrink-0">
              <p className="text-sm text-slate-400">{rows.length} résultat{rows.length > 1 ? 's' : ''}</p>
              <div className="flex gap-2">
                {exportUrl ? (
                  <a
                    href={exportUrl}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Télécharger
                  </a>
                ) : (
                  <>
                    <button
                      onClick={() => startExport('pdf')}
                      disabled={exporting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors disabled:opacity-40"
                    >
                      {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                      PDF
                    </button>
                    <button
                      onClick={() => startExport('excel')}
                      disabled={exporting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors disabled:opacity-40"
                    >
                      {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                      Excel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-y-auto sidebar-scroll p-5">
            {loading && (
              <div className="flex justify-center pt-20">
                <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
              </div>
            )}

            {!loading && rows.length === 0 && (
              <div className="flex flex-col items-center gap-3 pt-20 text-slate-600">
                <BarChart2 className="w-10 h-10 opacity-30" />
                <p className="text-sm">Configurez les filtres et cliquez sur Générer</p>
              </div>
            )}

            {!loading && rows.length > 0 && activeType === 'mileage' && (
              <MileageTable rows={rows} />
            )}
            {!loading && rows.length > 0 && activeType === 'stops' && (
              <StopsTable rows={rows} />
            )}
            {!loading && rows.length > 0 && activeType === 'speeding' && (
              <SpeedingTable rows={rows} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-tables ────────────────────────────────────────────────────────────────

function MileageTable({ rows }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
          {['Véhicule', 'Plaque', 'Trajets', 'Km total', 'Vitesse moy.', 'Vitesse max', 'Heures'].map((h) => (
            <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
            <td className="py-2.5 pr-4 font-medium text-white">{r.device?.name}</td>
            <td className="pr-4 font-mono text-slate-500 text-xs">{r.device?.plate_number ?? '—'}</td>
            <td className="pr-4 text-slate-300">{r.trip_count}</td>
            <td className="pr-4 text-brand-400 font-semibold">{r.total_km} km</td>
            <td className="pr-4 text-slate-300">{r.avg_speed} km/h</td>
            <td className="pr-4 text-rose-400">{r.max_speed} km/h</td>
            <td className="text-slate-400">{r.total_hours} h</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function StopsTable({ rows }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
          {['Arrivée', 'Départ', 'Durée', 'Adresse'].map((h) => (
            <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
            <td className="py-2.5 pr-4 text-slate-300 text-xs">{new Date(r.arrived_at).toLocaleString('fr-FR')}</td>
            <td className="pr-4 text-slate-300 text-xs">{new Date(r.departed_at).toLocaleString('fr-FR')}</td>
            <td className="pr-4 font-semibold text-amber-400">{r.dwell_minutes} min</td>
            <td className="text-slate-400 text-xs">{r.address ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SpeedingTable({ rows }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
          {['Véhicule', 'Vitesse', 'Excès', 'Date / Heure'].map((h) => (
            <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
            <td className="py-2.5 pr-4 font-medium text-white">{r.device?.name}</td>
            <td className="pr-4 text-rose-400 font-bold">{r.speed} km/h</td>
            <td className="pr-4 text-rose-300">+{r.excess_kmh} km/h</td>
            <td className="text-slate-400 text-xs">{new Date(r.occurred_at).toLocaleString('fr-FR')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
