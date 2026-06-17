import { useEffect, useMemo, useRef } from 'react'
import {
  MapContainer, TileLayer, Polyline,
  CircleMarker, Marker, useMap, ZoomControl,
} from 'react-leaflet'
import L from 'leaflet'
import { createVehicleIcon } from '@/components/map/vehicleIcon'

const DAKAR = [14.7167, -17.4677]

/** Fits the map to the full trip bounds once on load */
function BoundsController({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (!positions.length) return
    const bounds = L.latLngBounds(positions.map((p) => [p.latitude, p.longitude]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/** Keeps the moving marker in view during playback */
function FollowMarker({ position }) {
  const map = useMap()
  useEffect(() => {
    if (!position) return
    map.panTo([position.latitude, position.longitude], { animate: true, duration: 0.4 })
  }, [position, map])
  return null
}

export default function PlaybackMap({ positions, currentPosition, playing }) {
  const latlngs = useMemo(
    () => positions.map((p) => [p.latitude, p.longitude]),
    [positions]
  )

  // Breadcrumb up to current index
  const currentIndex = positions.indexOf(currentPosition)
  const travelledPath = useMemo(
    () => latlngs.slice(0, currentIndex + 1),
    [latlngs, currentIndex]
  )

  const icon = currentPosition
    ? createVehicleIcon(currentPosition.speed > 2 ? 'moving' : 'stopped', currentPosition.angle ?? 0)
    : null

  return (
    <MapContainer
      center={DAKAR}
      zoom={13}
      zoomControl={false}
      className="w-full h-full"
      preferCanvas
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; CARTO &copy; OSM"
        maxZoom={19}
      />

      <ZoomControl position="bottomright" />
      <BoundsController positions={positions} />
      {playing && currentPosition && <FollowMarker position={currentPosition} />}

      {/* Full ghost path */}
      {latlngs.length > 1 && (
        <Polyline
          positions={latlngs}
          pathOptions={{ color: '#334155', weight: 3, opacity: 0.5, dashArray: '6 4' }}
        />
      )}

      {/* Travelled portion */}
      {travelledPath.length > 1 && (
        <Polyline
          positions={travelledPath}
          pathOptions={{ color: '#22a3f7', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
        />
      )}

      {/* Start marker */}
      {latlngs[0] && (
        <CircleMarker
          center={latlngs[0]}
          radius={7}
          pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 1, weight: 2 }}
        />
      )}

      {/* End marker */}
      {latlngs[latlngs.length - 1] && (
        <CircleMarker
          center={latlngs[latlngs.length - 1]}
          radius={7}
          pathOptions={{ color: '#f43f5e', fillColor: '#f43f5e', fillOpacity: 1, weight: 2 }}
        />
      )}

      {/* Animated vehicle marker */}
      {currentPosition && icon && (
        <Marker
          position={[currentPosition.latitude, currentPosition.longitude]}
          icon={icon}
        />
      )}
    </MapContainer>
  )
}
