import api from './axios'

export const fetchGeofences    = ()         => api.get('/geofences').then((r) => r.data.data)
export const createGeofence    = (payload)  => api.post('/geofences', payload).then((r) => r.data.data)
export const updateGeofence    = (uuid, payload) => api.put(`/geofences/${uuid}`, payload).then((r) => r.data.data)
export const deleteGeofence    = (uuid)     => api.delete(`/geofences/${uuid}`).then((r) => r.data)
export const attachDevices     = (uuid, device_uuids) =>
  api.post(`/geofences/${uuid}/devices`, { device_uuids }).then((r) => r.data)
