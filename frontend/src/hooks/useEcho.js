import { useEffect, useRef } from 'react'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import useDeviceStore from '@/stores/deviceStore'

// Expose Pusher globally so Laravel Echo can find it
window.Pusher = Pusher

let echoInstance = null

function getEcho() {
  if (echoInstance) return echoInstance

  echoInstance = new Echo({
    broadcaster:     'pusher',
    key:             import.meta.env.VITE_PUSHER_APP_KEY      ?? 'senflote_key',
    cluster:         import.meta.env.VITE_PUSHER_APP_CLUSTER  ?? 'mt1',
    wsHost:          import.meta.env.VITE_PUSHER_HOST         ?? '127.0.0.1',
    wsPort:          import.meta.env.VITE_PUSHER_PORT         ?? 6001,
    wssPort:         import.meta.env.VITE_PUSHER_PORT         ?? 6001,
    forceTLS:        (import.meta.env.VITE_PUSHER_SCHEME      ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint:    '/broadcasting/auth',
    auth: {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('senflote_token') ?? ''}`,
      },
    },
  })

  return echoInstance
}

/**
 * Subscribes to the company's private tracking channel.
 * On `vehicle.position.updated` the Zustand store is updated,
 * which triggers a re-render of the affected marker only.
 */
export function useEcho(companyId) {
  const updateDevicePosition = useDeviceStore((s) => s.updateDevicePosition)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!companyId) return

    const echo = getEcho()
    const channelName = `company.${companyId}.tracking`

    channelRef.current = echo
      .private(channelName)
      .listen('.vehicle.position.updated', (payload) => {
        updateDevicePosition(payload)
      })

    return () => {
      echo.leave(channelName)
      channelRef.current = null
    }
  }, [companyId, updateDevicePosition])
}
