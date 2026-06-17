import api from './axios'

export const fetchAdminStats     = ()         => api.get('/admin/stats').then((r) => r.data.data)
export const fetchCompanies      = (params)   => api.get('/admin/companies', { params }).then((r) => r.data)
export const fetchCompany        = (id)       => api.get(`/admin/companies/${id}`).then((r) => r.data.data)
export const updateQuota         = (id, data) => api.patch(`/admin/companies/${id}/quota`, data).then((r) => r.data)
export const toggleCompanyStatus = (id)       => api.patch(`/admin/companies/${id}/toggle`).then((r) => r.data)

// Device pool management (super admin)
export const fetchPoolDevices    = ()         => api.get('/devices', { params: { pool: 1 } }).then((r) => r.data.data)
export const assignDeviceToCompany = (deviceUuid, companyUuid, userUuid = null) =>
  api.patch(`/devices/${deviceUuid}/assign-company`, { company_uuid: companyUuid, assigned_user_uuid: userUuid }).then((r) => r.data.data)
export const returnDeviceToPool  = (deviceUuid) =>
  api.patch(`/devices/${deviceUuid}/assign-company`, { company_uuid: null }).then((r) => r.data.data)
