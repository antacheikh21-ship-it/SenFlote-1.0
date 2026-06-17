import api from './axios'

export const fetchMileageReport = (params) =>
  api.get('/reports/mileage', { params }).then((r) => r.data.data)

export const fetchStopsReport = (params) =>
  api.get('/reports/stops', { params }).then((r) => r.data.data)

export const fetchSpeedingReport = (params) =>
  api.get('/reports/speeding', { params }).then((r) => r.data.data)

export const requestExport = (body) =>
  api.post('/reports/export', body).then((r) => r.data)

export const pollExportStatus = (jobId) =>
  api.get(`/reports/export/${jobId}/status`).then((r) => r.data)
