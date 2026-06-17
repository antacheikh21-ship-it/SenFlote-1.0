import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Zap, Building2, Rocket } from 'lucide-react'
import api from '@/api/axios'

const PLAN_ICONS = { basic: Zap, pro: Rocket, enterprise: Building2 }
const PLAN_COLORS = {
  basic:      { border: 'border-slate-700', badge: 'bg-slate-700 text-slate-300' },
  pro:        { border: 'border-brand-500', badge: 'bg-brand-600 text-white' },
  enterprise: { border: 'border-amber-500', badge: 'bg-amber-500/20 text-amber-400' },
}

export default function BillingPage() {
  const [plans,    setPlans]    = useState([])
  const [cycle,    setCycle]    = useState('monthly') // monthly | yearly
  const [loading,  setLoading]  = useState(true)
  const [paying,   setPaying]   = useState(null) // planId + provider being processed

  useEffect(() => {
    api.get('/plans').then((r) => { setPlans(r.data.data); setLoading(false) })
  }, [])

  const initiatePayment = async (planId, provider) => {
    setPaying(`${planId}-${provider}`)
    try {
      const endpoint =
        provider === 'wave' ? '/payments/wave/initiate' : '/payments/orange-money/initiate'
      const { data } = await api.post(endpoint, { plan_id: planId, billing_cycle: cycle })
      const url = data.checkout_url ?? data.payment_url
      if (url && url !== '#') window.location.href = url
    } finally {
      setPaying(null)
    }
  }

  const yearlyDiscount = (price) => Math.round(price * 12 * 0.85).toLocaleString('fr-SN')
  const monthly        = (price) => price.toLocaleString('fr-SN')

  return (
    <div className="min-h-full bg-slate-950 text-slate-200 px-6 py-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-white mb-2">Choisissez votre abonnement</h1>
          <p className="text-slate-500 text-sm">Gérez votre flotte en toute confiance</p>

          {/* Billing toggle */}
          <div className="inline-flex mt-6 bg-slate-800 rounded-xl p-1 gap-1">
            {['monthly', 'yearly'].map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  cycle === c ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {c === 'monthly' ? 'Mensuel' : 'Annuel'}
                {c === 'yearly' && (
                  <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                    -15%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plans grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const Icon   = PLAN_ICONS[plan.slug]   ?? Zap
              const colors = PLAN_COLORS[plan.slug]  ?? PLAN_COLORS.basic
              const isPro  = plan.slug === 'pro'

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 ${colors.border} bg-slate-900 p-6 flex flex-col gap-4
                    ${isPro ? 'shadow-xl shadow-brand-500/10' : ''}`}
                >
                  {isPro && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-brand-600 text-white text-xs font-bold rounded-full">
                      Populaire
                    </span>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`p-1.5 rounded-lg ${colors.badge}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <h2 className="font-bold text-white text-lg">{plan.name}</h2>
                    </div>
                    <p className="text-3xl font-extrabold text-white mt-3">
                      {cycle === 'yearly' ? yearlyDiscount(plan.price_xof) : monthly(plan.price_xof)}
                      <span className="text-base font-normal text-slate-500 ml-1">
                        XOF / {cycle === 'yearly' ? 'an' : 'mois'}
                      </span>
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="flex-1 space-y-2 text-sm">
                    {[
                      `${plan.max_vehicles >= 9999 ? 'Illimité' : plan.max_vehicles} véhicules`,
                      `${plan.max_geofences >= 9999 ? 'Illimité' : plan.max_geofences} géofences`,
                      `${plan.history_days} jours d'historique`,
                      plan.has_reports   && 'Rapports PDF / Excel',
                      plan.has_playback  && 'Rejeu de trajets',
                      plan.has_api_access && 'Accès API',
                    ].filter(Boolean).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Payment buttons */}
                  <div className="space-y-2 pt-2">
                    <PayBtn
                      label="Payer avec Wave"
                      color="bg-[#1B7FE1] hover:bg-[#1566C0]"
                      loading={paying === `${plan.id}-wave`}
                      onClick={() => initiatePayment(plan.id, 'wave')}
                    />
                    <PayBtn
                      label="Orange Money"
                      color="bg-[#FF6200] hover:bg-[#E55500]"
                      loading={paying === `${plan.id}-orange_money`}
                      onClick={() => initiatePayment(plan.id, 'orange_money')}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PayBtn({ label, color, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${color} disabled:opacity-50`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : label}
    </button>
  )
}
