import { create } from 'zustand'
import { me } from '@/api/auth'

const TOKEN_KEY = 'senflote_token'

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY) ?? null,
  loading: true,   // true until initial /me resolves

  setAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token)
    set({ token, user, loading: false })
  },

  clearAuth() {
    localStorage.removeItem(TOKEN_KEY)
    set({ user: null, token: null, loading: false })
  },

  async init() {
    if (!get().token) {
      set({ loading: false })
      return
    }
    try {
      const user = await me()
      set({ user, loading: false })
    } catch {
      get().clearAuth()
    }
  },

  get isAuthenticated() {
    return !!get().token && !!get().user
  },

  get isSuperAdmin() {
    return get().user?.role === 'super_admin'
  },
}))

export default useAuthStore
