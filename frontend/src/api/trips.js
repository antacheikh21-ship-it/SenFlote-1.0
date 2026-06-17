import api from './axios'

export const fetchTrips = (params = {}) =>
  api.get('/trips', { params }).then((r) => r.data)

export const fetchTrip = (id) =>
  api.get(`/trips/${id}`).then((r) => r.data.data)

export const fetchTripPositions = (id) =>
  api.get(`/trips/${id}/positions`).then((r) => r.data.data)
