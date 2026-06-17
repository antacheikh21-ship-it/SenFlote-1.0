import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '@/api/auth'
import useAuthStore from '@/stores/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handle = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setErrors((er) => ({ ...er, [e.target.name]: null }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      const { token, data: user } = await register(form)
      setAuth(token, user)
      navigate('/tracking', { replace: true })
    } catch (err) {
      const apiErrors = err.response?.data?.errors ?? {}
      if (Object.keys(apiErrors).length) {
        setErrors(apiErrors)
      } else {
        setErrors({ _global: err.response?.data?.message ?? 'Erreur d\'inscription.' })
      }
    } finally {
      setLoading(false)
    }
  }

  const field = (name, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5 font-medium">{label}</label>
      <input
        name={name}
        type={type}
        required={!['company_phone'].includes(name)}
        value={form[name]}
        onChange={handle}
        className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-white text-sm
                    placeholder-slate-500 focus:outline-none focus:ring-1 transition
                    ${errors[name]
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-700 focus:border-brand-500 focus:ring-brand-500'}`}
        placeholder={placeholder}
      />
      {errors[name] && (
        <p className="mt-1 text-xs text-rose-400">{errors[name][0]}</p>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-base select-none">
            SF
          </span>
          <span className="text-white font-bold text-xl tracking-tight">SenFlote</span>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h1 className="text-white font-semibold text-lg mb-5">Créer un compte</h1>

          {errors._global && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {errors._global}
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Entreprise
            </p>
            {field('company_name',  'Nom de l\'entreprise', 'text', 'Transport Dakar SA')}
            {field('company_email', 'Email professionnel',  'email', 'contact@entreprise.sn')}
            {field('company_phone', 'Téléphone (optionnel)', 'tel', '+221 77 000 00 00')}

            <div className="border-t border-slate-800 pt-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Votre compte
              </p>
            </div>
            {field('name',                  'Nom complet',          'text',     'Mamadou Diallo')}
            {field('email',                 'Email personnel',      'email',    'vous@entreprise.sn')}
            {field('password',              'Mot de passe',         'password', '••••••••')}
            {field('password_confirmation', 'Confirmer le mot de passe', 'password', '••••••••')}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50
                         disabled:cursor-not-allowed text-white font-semibold text-sm
                         py-2.5 rounded-lg transition-colors mt-1"
            >
              {loading ? 'Création…' : 'Créer le compte'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-5">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
