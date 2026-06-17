import { useEffect } from 'react'
import { fetchDevices } from '@/api/devices'
import useDeviceStore from '@/stores/deviceStore'

/**
 * Loads all devices once on mount and populates the store.
 * Polling every 30s keeps the sidebar fresh for offline detection
 * without relying solely on WebSocket (which only fires on position events).
 */
export function useDevices() {
  const setDevices = useDeviceStore((s) => s.setDevices)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await fetchDevices()
        if (!cancelled) setDevices(data)
      } catch {
        // Silently retry on next poll interval
      }
    }

    load()
    const interval = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [setDevices])
}
