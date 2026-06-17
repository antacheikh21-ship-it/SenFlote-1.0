import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Map, AlertTriangle, BarChart2, Settings, LogOut, Menu, Shield } from 'lucide-react'
import Sidebar from '@/components/sidebar/Sidebar'
import useAuthStore from '@/stores/authStore'
import { logout as apiLogout } from '@/api/auth'

const NAV = [
  { icon: Map,             label: 'Live',         href: '/tracking'   },
  { icon: LayoutDashboard, label: 'Tableau',       href: '/dashboard'  },
  { icon: Shield,          label: 'Géozones',      href: '/geofences'  },
  { icon: BarChart2,       label: 'Rapports',      href: '/reports'    },
  { icon: AlertTriangle,   label: 'Alertes',       href: '/alerts'     },
  { icon: Settings,        label: 'Paramètres',    href: '/settings'   },
]

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate   = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    try { await apiLogout() } catch { /* ignore */ }
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    /*
     * Layout structure (desktop):
     * ┌──────────┬─────────────────────────────────────────────────┐
     * │ Icon Nav │ Sidebar (vehicle list) │ Map (full remaining)   │
     * └──────────┴─────────────────────────────────────────────────┘
     *
     * On mobile: nav hidden, sidebar slides over map as a drawer.
     */
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">

      {/* ── Vertical icon nav (desktop only) ─────────────────────────── */}
      <nav className="hidden md:flex flex-col items-center gap-1 py-4 px-1.5 bg-slate-950 border-r border-slate-800 w-14 flex-shrink-0">
        {/* Logo */}
        <span className="mb-3 w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-black text-sm select-none">
          SF
        </span>

        {NAV.map(({ icon: Icon, label, href }) => (
          <NavLink
            key={href}
            to={href}
            title={label}
            className={({ isActive }) => `
              flex flex-col items-center justify-center w-10 h-10 rounded-xl
              transition-all duration-150 group relative
              ${isActive
                ? 'bg-brand-600/20 text-brand-400'
                : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800'}
            `}
          >
            <Icon className="w-5 h-5" />
            <span className="
              absolute left-full ml-2 px-2 py-1 text-xs font-medium
              bg-slate-800 text-slate-200 rounded-lg border border-slate-700
              opacity-0 group-hover:opacity-100 pointer-events-none
              whitespace-nowrap transition-opacity duration-150 z-50
            ">
              {label}
            </span>
          </NavLink>
        ))}

        <div className="flex-1" />

        {user && (
          <div
            title={user.name}
            className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center
                       text-white text-xs font-bold select-none mb-1"
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}

        <button
          onClick={handleLogout}
          title="Déconnexion"
          className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-600
                     hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </nav>

      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-12
                      flex items-center px-4 gap-3 bg-slate-900/95 backdrop-blur
                      border-b border-slate-800">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="text-slate-400 hover:text-slate-200"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-bold text-white text-sm">SenFlote</span>
        <span className="ml-auto text-xs text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
          Live
        </span>
      </div>

      {/* ── Mobile sidebar drawer ─────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-72 h-full flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">
            <Sidebar />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar + map ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar — desktop only inline */}
        <div className="hidden md:flex relative flex-shrink-0">
          <Sidebar />
        </div>

        {/* Map — fills all remaining space */}
        <main className="flex-1 relative mt-12 md:mt-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
