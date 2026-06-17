import { useEffect, useRef } from 'react'
import { Marker, Popup, useMap } from 'react-leaflet'
import { createVehicleIcon } from './vehicleIcon'
import VehiclePopup from './VehiclePopup'
import useDeviceStore from '@/stores/deviceStore'

export default function VehicleMarker({ device }) {
  const markerRef  = useRef(null)
  const map        = useMap()
  const selectedId = useDeviceStore((s) => s.selectedDeviceId)
  const isSelected = selectedId === device.uuid

  const lat = device.last_lat
  const lng = device.last_lng

  // Hooks must all run before any conditional return
  useEffect(() => {
    if (!isSelected || !lat || !lng || !markerRef.current) return
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.8 })
    markerRef.current.openPopup()
  }, [isSelected]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!lat || !lng) return null

  const icon = createVehicleIcon(device.status, device.last_angle ?? 0)

  return (
    <Marker
      ref={markerRef}
      position={[lat, lng]}
      icon={icon}
      zIndexOffset={isSelected ? 1000 : 0}
    >
      <Popup className="vehicle-popup" maxWidth={270} closeButton={false}>
        <VehiclePopup device={device} />
      </Popup>
    </Marker>
  )
}
