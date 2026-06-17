import { create } from 'zustand'
import { shallow } from 'zustand/shallow'

const useDeviceStore = create((set, get) => ({
  devices:          {},          // { [uuid]: deviceObject }
  selectedDeviceId: null,
  statusFilter:     'all',       // 'all' | 'moving' | 'idle' | 'stopped' | 'offline'
  searchQuery:      '',
  sidebarOpen:      true,

  setDevices(deviceArray) {
    const map = {}
    deviceArray.forEach((d) => { map[d.uuid] = d })
    set({ devices: map })
  },

  updateDevicePosition(payload) {
    const { device, position } = payload
    set((state) => ({
      devices: {
        ...state.devices,
        [device.uuid]: {
          ...(state.devices[device.uuid] ?? {}),
          ...device,
          last_lat:     position.latitude,
          last_lng:     position.longitude,
          last_speed:   position.speed,
          last_angle:   position.angle,
          last_seen_at: position.device_time,
        },
      },
    }))
  },

  selectDevice(uuid) {
    set((s) => ({ selectedDeviceId: uuid === s.selectedDeviceId ? null : uuid }))
  },

  setStatusFilter(filter) { set({ statusFilter: filter }) },
  setSearchQuery(q)       { set({ searchQuery: q }) },
  toggleSidebar()         { set((s) => ({ sidebarOpen: !s.sidebarOpen })) },
}))

// ── Reusable selectors (computed outside the store to avoid getter pitfall) ──

export function selectFilteredDevices(s) {
  const q = s.searchQuery.toLowerCase().trim()
  return Object.values(s.devices).filter((d) => {
    const matchStatus = s.statusFilter === 'all' || d.status === s.statusFilter
    const matchSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      (d.plate_number ?? '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })
}

export function selectCounts(s) {
  const all = Object.values(s.devices)
  return {
    all:     all.length,
    moving:  all.filter((d) => d.status === 'moving').length,
    idle:    all.filter((d) => d.status === 'idle').length,
    offline: all.filter((d) => d.status === 'offline').length,
    stopped: all.filter((d) => d.status === 'stopped').length,
  }
}

// Hook wrappers with shallow equality to prevent spurious re-renders
export function useFilteredDevices() {
  return useDeviceStore(selectFilteredDevices, shallow)
}

export function useCounts() {
  return useDeviceStore(selectCounts, shallow)
}

export default useDeviceStore
