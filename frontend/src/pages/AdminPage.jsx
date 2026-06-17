import { useEffect, useState, useCallback } from 'react'
import {
  Building2, Users, Truck, TrendingUp,
  ToggleLeft, ToggleRight, Pencil, Check, X,
  Search, Loader2, ChevronLeft, ChevronRight,
  Radio, ArrowRight, RotateCcw,
} from 'lucide-react'
import {
  fetchAdminStats, fetchCompanies, updateQuota, toggleCompanyStatus,
  fetchPoolDevices, assignDeviceToCompany, returnDeviceToPool,
} from '@/api/admin'
import api from '@/api/axios'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
      <span className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4 text-white" /></span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Device pool section ───────────────────────────────────────────────────────
function DevicePoolSection({ companies }) {
  const [devices,  setDevices]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [assigning, setAssigning] = useState(null) // device uuid being assigned

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const all = await api.get('/devices').then((r) => r.data.data)
      setDevices(all)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const pool    = devices.filter((d) => d.company_id == null)
  const assigned = devices.filter((d) => d.company_id != null)

  const doAssign = async (deviceUuid, companyUuid) => {
    setAssigning(deviceUuid)
    try {
      await assignDeviceToCompany(deviceUuid, companyUuid)
      await load()
    } catch { /* ignore */ }
    setAssigning(null)
  }

  const doReturn = async (deviceUuid) => {
    setAssigning(deviceUuid)
    try {
      await returnDeviceToPool(deviceUuid)
      await load()
    } catch { /* ignore */ }
    setAssigning(null)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800">
        <Radio className="w-4 h-4 text-brand-400" />
        <h2 className="text-sm font-semibold text-white">Balises GPS</h2>
        <span className="ml-auto text-xs text-slate-500">
          {pool.length} en pool · {assigned.length} assignée{assigned.length !== 1 ? 's' : ''}
        </span>
        {loading && <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
      </div>

      {/* Pool — unassigned devices */}
      {pool.length > 0 && (
        <div className="border-b border-slate-800">
          <p className="px-5 py-2 text-[11px] font-semibold uppercase text-slate-600 tracking-wider">
            Pool non assigné ({pool.length})
          </p>
          {pool.map((device) => (
            <DeviceRow
              key={device.uuid}
              device={device}
              companies={companies}
              busy={assigning === device.uuid}
              onAssign={(companyUuid) => doAssign(device.uuid, companyUuid)}
              onReturn={null}
            />
          ))}
        </div>
      )}

      {/* Assigned devices */}
      {assigned.length > 0 && (
        <div>
          <p className="px-5 py-2 text-[11px] font-semibold uppercase text-slate-600 tracking-wider">
            Assignées à une entreprise ({assigned.length})
          </p>
          {assigned.map((device) => (
            <DeviceRow
              key={device.uuid}
              device={device}
              companies={companies}
              busy={assigning === device.uuid}
              onAssign={(companyUuid) => doAssign(device.uuid, companyUuid)}
              onReturn={() => doReturn(device.uuid)}
            />
          ))}
        </div>
      )}

      {!loading && devices.length === 0 && (
        <p className="text-center py-8 text-slate-600 text-sm">
          Aucune balise enregistrée
        </p>
      )}
    </div>
  )
}

function DeviceRow({ device, companies, busy, onAssign, onReturn }) {
  const [open, setOpen] = useState(false)

  const currentCompany = companies.find((c) => {
    // company_id is numeric; companies from admin list use id
    return c.id === device.company_id
  })

  return (
    <div className="border-b border-slate-800/50 last:border-0">
      <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-800/30 transition-colors">
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
          device.status === 'moving'  ? 'bg-emerald-400' :
          device.status === 'idle'    ? 'bg-amber-400' :
          device.status === 'stopped' ? 'bg-blue-400' : 'bg-slate-600'
        }`} />

        {/* Device info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{device.name}</p>
          <p className="text-xs text-slate-500">
            ID: {device.traccar_unique_id}
            {device.plate_number && ` · ${device.plate_number}`}
          </p>
        </div>

        {/* Current company */}
        <span className="hidden md:block text-xs text-slate-500 max-w-[140px] truncate">
          {currentCompany ? currentCompany.name : <span className="text-amber-400">Pool</span>}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {onReturn && (
            <button
              onClick={onReturn}
              disabled={busy}
              title="Retirer au pool"
              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            disabled={busy}
            title="Assigner à une entreprise"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
              open
                ? 'bg-brand-600/20 text-brand-300'
                : 'text-slate-500 hover:text-brand-300 hover:bg-brand-600/10'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Assigner
          </button>
        </div>
      </div>

      {/* Assign dropdown */}
      {open && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => { onAssign(company.uuid); setOpen(false) }}
              disabled={busy || device.company_id === company.id}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-40 ${
                device.company_id === company.id
                  ? 'border-brand-500/50 bg-brand-600/20 text-brand-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-brand-500/50 hover:text-white'
              }`}
            >
              {company.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Quota editor inline ───────────────────────────────────────────────────────
function QuotaEditor({ company, onSaved }) {
  const plan  = company.active_subscription?.plan
  const sett  = company.settings ?? {}

  const [vehicles,  setVehicles]  = useState(sett.quota_max_vehicles  ?? plan?.max_vehicles  ?? '')
  const [geofences, setGeofences] = useState(sett.quota_max_geofences ?? plan?.max_geofences ?? '')
  const [history,   setHistory]   = useState(sett.quota_history_days  ?? plan?.history_days  ?? '')
  const [saving,    setSaving]    = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await updateQuota(company.id, {
        max_vehicles:  Number(vehicles)  || null,
        max_geofences: Number(geofences) || null,
        history_days:  Number(history)   || null,
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const field = (label, val, setter, max) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-slate-500 uppercase font-semibold">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number" min={0} max={max} value={val}
          onChange={(e) => setter(e.target.value)}
          className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-500"
        />
        {plan && <span className="text-[10px] text-slate-600">/ plan: {max >= 9999 ? '∞' : max}</span>}
      </div>
    </div>
  )

  return (
    <div className="mt-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
      <p className="text-xs font-semibold text-slate-400">Quotas personnalisés</p>
      <div className="flex flex-wrap gap-4">
        {field('Véhicules',  vehicles,  setVehicles,  plan?.max_vehicles  ?? 9999)}
        {field('Géofences',  geofences, setGeofences, plan?.max_geofences ?? 9999)}
        {field('Historique', history,   setHistory,   plan?.history_days  ?? 365)}
      </div>
      <button
        onClick={save} disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        Enregistrer
      </button>
    </div>
  )
}

// ── Company row ───────────────────────────────────────────────────────────────
function CompanyRow({ company, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [toggling, setToggling] = useState(false)

  const plan  = company.active_subscription?.plan
  const used  = company.devices_count ?? 0
  const limit = company.settings?.quota_max_vehicles ?? plan?.max_vehicles ?? 0
  const pct   = limit ? Math.min((used / limit) * 100, 100) : 0

  const toggle = async () => {
    setToggling(true)
    await toggleCompanyStatus(company.id)
    await onRefresh()
    setToggling(false)
  }

  return (
    <li className="border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/30 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{company.name}</p>
          <p className="text-xs text-slate-500">{company.email}</p>
        </div>
        <span className="hidden md:inline text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium capitalize">
          {plan?.slug ?? 'Aucun'}
        </span>
        <div className="hidden lg:flex flex-col gap-1 w-32">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>{used} véhicules</span>
            <span>{limit >= 9999 ? '∞' : limit}</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="hidden md:flex items-center gap-1 text-xs text-slate-500">
          <Users className="w-3 h-3" /> {company.users_count}
        </span>
        <button
          onClick={toggle} disabled={toggling}
          title={company.is_active ? 'Désactiver' : 'Activer'}
          className="text-slate-500 hover:text-slate-200 disabled:opacity-40 transition-colors"
        >
          {toggling
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : company.is_active
              ? <ToggleRight className="w-5 h-5 text-emerald-400" />
              : <ToggleLeft  className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`p-1 rounded transition-colors ${expanded ? 'text-brand-400' : 'text-slate-600 hover:text-slate-300'}`}
        >
          {expanded ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        </button>
      </div>
      {expanded && (
        <div className="px-5 pb-4">
          <QuotaEditor company={company} onSaved={onRefresh} />
        </div>
      )}
    </li>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [stats,       setStats]       = useState(null)
  const [page,        setPage]        = useState({ data: [], meta: {} })
  const [search,      setSearch]      = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [s, p] = await Promise.all([
      fetchAdminStats(),
      fetchCompanies({ search, page: currentPage }),
    ])
    setStats(s)
    setPage(p)
    setLoading(false)
  }, [search, currentPage])

  useEffect(() => { load() }, [load])

  const fmtXof = (n) => (n ?? 0).toLocaleString('fr-SN') + ' XOF'
  const companies = page.data ?? []

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 overflow-auto sidebar-scroll">
      <div className="max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">Administration</h1>
          <p className="text-sm text-slate-500">Gestion des tenants, quotas et balises GPS</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Building2}  label="Entreprises"   value={stats.total_companies} sub={`${stats.active_companies} actives`} color="bg-brand-600"  />
            <StatCard icon={Truck}      label="Véhicules"      value={stats.total_devices}   sub={`${stats.active_devices} actifs`}   color="bg-emerald-600"/>
            <StatCard icon={Users}      label="Utilisateurs"   value={stats.total_users}     color="bg-purple-600"/>
            <StatCard icon={TrendingUp} label="Revenu mensuel" value={fmtXof(stats.mrr_xof)} color="bg-amber-600"/>
          </div>
        )}

        {/* Plans breakdown */}
        {stats?.plans_breakdown && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Répartition des plans</p>
            <div className="flex gap-4 flex-wrap">
              {stats.plans_breakdown.map(({ plan, count }) => (
                <div key={plan} className="text-center">
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-xs text-slate-500 capitalize">{plan}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Device pool */}
        <DevicePoolSection companies={companies} />

        {/* Company list */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-800">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                placeholder="Rechercher une entreprise…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>
            {loading && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
          </div>
          <ul>
            {companies.map((company) => (
              <CompanyRow key={company.id} company={company} onRefresh={load} />
            ))}
            {!loading && companies.length === 0 && (
              <li className="text-center py-12 text-slate-600 text-sm">Aucune entreprise trouvée</li>
            )}
          </ul>
          {page.meta?.last_page > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 text-sm text-slate-500">
              <span>Page {page.meta.current_page} / {page.meta.last_page}</span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-slate-800 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentPage((p) => Math.min(page.meta.last_page, p + 1))} disabled={currentPage === page.meta.last_page} className="p-1 rounded hover:bg-slate-800 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
