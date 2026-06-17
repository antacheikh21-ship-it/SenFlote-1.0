import { Navigate } from 'react-router-dom'
import useAuthStore from '@/stores/authStore'

export default function PrivateRoute({ children }) {
  const { token, user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <span className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  return children
}
