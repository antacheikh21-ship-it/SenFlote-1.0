import { useState, useCallback } from 'react'
import {
  MapContainer,
  TileLayer,
  ZoomControl,
  Circle,
  Polygon,
  Tooltip,
  useMapEvents,
} from 'react-leaflet'
import { Eye, EyeOff } from 'lucide-react'
import useDeviceStore, { useFilteredDevices } from '@/stores/deviceStore'
import VehicleMarker from './VehicleMarker'
import LayerControl from './LayerControl'
import 'leaflet/dist/leaflet.css'

const LAYERS = {
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
    maxZoom: 18,
  },
}

const DEFAULT_CENTER = [14.7167, -17.4677]
const DEFAULT_ZOOM   = 12

function MapClickHandler() {
  const selectDevice = useDeviceStore((s) => s.selectDevice)
  const selectedId   = useDeviceStore((s) => s.selectedDeviceId)

  useMapEvents({
    click() {
      if (selectedId) selectDevice(null)
    },
  })

  return null
}

function GeofenceOverlay({ geo }) {
  const pathOpts = { color: geo.color ?? '#3B82F6', weight: 2, fillOpacity: 0.12 }

  if (geo.type === 'circle' && geo.center_lat != null && geo.center_lng != null) {
    return (
      <Circle
        center={[geo.center_lat, geo.center_lng]}
        radius={geo.radius_meters}
        pathOptions={pathOpts}
      >
        <Tooltip sticky>{geo.name}</Tooltip>
      </Circle>
    )
  }

  if (geo.type === 'polygon' && Array.isArray(geo.coordinates) && geo.coordinates.length >= 3) {
    return (
      <Polygon positions={geo.coordinates} pathOptions={pathOpts}>
        <Tooltip sticky>{geo.name}</Tooltip>
      </Polygon>
    )
  }

  return null
}

export default function TrackingMap({ geofences = [] }) {
  const devices = useFilteredDevices()
  const [layer, setLayer]           = useState('street')
  const [showGeofences, setShowGeo] = useState(true)

  const handleLayerChange = useCallback((key) => setLayer(key), [])

  const tl = LAYERS[layer]

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="w-full h-full"
        preferCanvas={true}
      >
        <TileLayer
          key={layer}
          url={tl.url}
          attribution={tl.attribution}
          maxZoom={tl.maxZoom}
        />

        <ZoomControl position="bottomright" />
        <MapClickHandler />

        {showGeofences && geofences.map((geo) => (
          <GeofenceOverlay key={geo.uuid} geo={geo} />
        ))}

        {devices.map((device) => (
          <VehicleMarker key={device.uuid} device={device} />
        ))}
      </MapContainer>

      {/* ── Layer switcher (top-right overlay) ─────────────────────────── */}
      <div className="absolute top-3 right-3 z-[1000]">
        <LayerControl activeLayer={layer} onLayerChange={handleLayerChange} />
      </div>

      {/* ── Live indicator + geofence toggle (top-left overlay) ────────── */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm
                        border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
          Temps réel
        </div>

        {geofences.length > 0 && (
          <button
            onClick={() => setShowGeo((v) => !v)}
            title={showGeofences ? 'Masquer les géozones' : 'Afficher les géozones'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                        border backdrop-blur-sm transition-all duration-150
                        ${showGeofences
                          ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
                          : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-200'}`}
          >
            {showGeofences ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Géozones{showGeofences && geofences.length > 0 ? ` (${geofences.length})` : ''}
          </button>
        )}
      </div>
    </div>
  )
}
