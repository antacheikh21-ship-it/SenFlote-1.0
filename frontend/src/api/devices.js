import api from './axios'

export const fetchDevices = () =>
  api.get('/devices').then((r) => r.data.data)

export const fetchDevicePositions = (deviceId, params = {}) =>
  api.get(`/devices/${deviceId}/positions`, { params }).then((r) => r.data.data)

export const fetchDeviceTrips = (deviceId, params = {}) =>
  api.get(`/devices/${deviceId}/trips`, { params }).then((r) => r.data.data)
