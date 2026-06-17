import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { Accept: 'application/json' },
})

// Attach Sanctum token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('senflote_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global 401 handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('senflote_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
