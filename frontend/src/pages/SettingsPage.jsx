import { useEffect, useState } from 'react'
import { Building2, User, Save } from 'lucide-react'
import api from '@/api/axios'
import useAuthStore from '@/stores/authStore'

function Field({ label, name, type = 'text', value, onChange, disabled }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5 font-medium">{label}</label>
      <input
        name={name}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white
                   text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500
                   focus:ring-1 focus:ring-brand-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [company, setCompany] = useState(null)
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const canEdit = user?.role === 'company_admin' || user?.role === 'super_admin'

  useEffect(() => {
    if (!user?.company) return
    api.get('/company').then((r) => {
      setCompany(r.data.data)
      setForm({
        name:     r.data.data.name,
        phone:    r.data.data.phone ?? '',
        timezone: r.data.data.timezone,
      })
    }).catch(() => {})
  }, [user])

  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/company', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6">
      <h1 className="text-white font-bold text-xl mb-6">Paramètres</h1>

      <div className="max-w-xl space-y-6">

        {/* Profil utilisateur */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-brand-400" />
            Mon profil
          </h2>
          <div className="space-y-3">
            <Field label="Nom"   name="name"  value={user?.name}  disabled />
            <Field label="Email" name="email" value={user?.email} disabled />
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Rôle</label>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-brand-600/15 text-brand-400 text-xs font-medium capitalize">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Entreprise */}
        {user?.company && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-brand-400" />
              Entreprise
            </h2>
            <form onSubmit={submit} className="space-y-3">
              <Field label="Nom de l'entreprise" name="name"     value={form.name}     onChange={handle} disabled={!canEdit} />
              <Field label="Téléphone"           name="phone"    value={form.phone}    onChange={handle} disabled={!canEdit} />
              <Field label="Fuseau horaire"      name="timezone" value={form.timezone} onChange={handle} disabled={!canEdit} />
              <Field label="Email"  name="email" value={company?.email}   disabled />
              <Field label="Pays"   name="country" value={company?.country} disabled />

              {canEdit && (
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500
                             disabled:opacity-50 text-white text-sm font-semibold rounded-lg
                             transition-colors mt-2"
                >
                  <Save className="w-4 h-4" />
                  {saved ? 'Enregistré !' : saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
