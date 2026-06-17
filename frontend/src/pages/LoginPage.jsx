import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '@/api/auth'
import useAuthStore from '@/stores/authStore'

export default function LoginPage() {
  const navigate   = useNavigate()
  const setAuth    = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { token, data: user } = await login(form.email, form.password)
      setAuth(token, user)
      navigate('/tracking', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.errors?.email?.[0]
        ?? err.response?.data?.message
        ?? 'Erreur de connexion.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-base select-none">
            SF
          </span>
          <span className="text-white font-bold text-xl tracking-tight">SenFlote</span>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h1 className="text-white font-semibold text-lg mb-5">Connexion</h1>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Adresse email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handle}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-white text-sm placeholder-slate-500 focus:outline-none
                           focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                placeholder="vous@entreprise.sn"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Mot de passe
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={handle}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-white text-sm placeholder-slate-500 focus:outline-none
                           focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50
                         disabled:cursor-not-allowed text-white font-semibold text-sm
                         py-2.5 rounded-lg transition-colors mt-1"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-5">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
