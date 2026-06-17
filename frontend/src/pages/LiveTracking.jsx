import { useEffect, useState } from 'react'
import { useDevices }       from '@/hooks/useDevices'
import { useEcho }          from '@/hooks/useEcho'
import TrackingMap          from '@/components/map/TrackingMap'
import { fetchGeofences }   from '@/api/geofences'
import useAuthStore from '@/stores/authStore'

export default function LiveTracking() {
  const companyId  = useAuthStore((s) => s.user?.company_id)

  const [geofences, setGeofences] = useState([])

  useDevices()
  useEcho(companyId)

  useEffect(() => {
    fetchGeofences()
      .then(setGeofences)
      .catch(() => {})
  }, [])

  return (
    <div className="w-full h-full">
      <TrackingMap geofences={geofences} />
    </div>
  )
}
