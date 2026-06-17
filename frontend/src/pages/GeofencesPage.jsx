import { useEffect, useRef, useState, useCallback } from 'react'
import {
  MapContainer, TileLayer, ZoomControl, Circle, Polygon,
  Marker, Polyline, useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import { Plus, Trash2, Pencil, Shield, X, Check, ChevronRight } from 'lucide-react'
import { fetchGeofences, createGeofence, updateGeofence, deleteGeofence } from '@/api/geofences'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER = [14.7167, -17.4677]
const DEFAULT_ZOOM   = 12

const TILE = {
  url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  attribution: '&copy; CARTO &copy; OpenStreetMap',
}

// Crosshair cursor icon for map clicks while drawing
const crosshairIcon = L.divIcon({
  className: '',
  html: '<div style="width:12px;height:12px;border:2px solid white;border-radius:50%;background:rgba(59,130,246,0.6)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

// ── Map event handler (draw mode) ─────────────────────────────────────────────
function DrawHandler({ mode, onCircleClick, onPolygonClick }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      if (mode === 'circle')  onCircleClick(lat, lng)
      if (mode === 'polygon') onPolygonClick(lat, lng)
    },
  })
  return null
}

// ── Colour swatch ─────────────────────────────────────────────────────────────
const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6']

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-full border-2 transition ${
            value === c ? 'border-white scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  )
}

// ── Geofence list item ────────────────────────────────────────────────────────
function GeoItem({ geo, selected, onSelect, onEdit, onDelete }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
        selected ? 'bg-slate-700' : 'hover:bg-slate-800'
      }`}
      onClick={() => onSelect(geo)}
    >
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: geo.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{geo.name}</p>
        <p className="text-slate-500 text-xs">
          {geo.type === 'circle' ? `Cercle · ${geo.radius_meters} m` : 'Polygone'}
        </p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(geo) }}
          className="p-1 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-white"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(geo) }}
          className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
    </div>
  )
}

// ── Geofence form ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', color: '#3B82F6', type: 'circle',
  center_lat: '', center_lng: '', radius_meters: 500,
  coordinates: [],
  alert_on_enter: true, alert_on_exit: true,
}

export default function GeofencesPage() {
  const [geofences, setGeofences]     = useState([])
  const [selected, setSelected]       = useState(null)
  const [panelMode, setPanelMode]     = useState('list') // 'list' | 'form'
  const [editTarget, setEditTarget]   = useState(null)   // uuid being edited
  const [form, setForm]               = useState(EMPTY_FORM)
  const [drawMode, setDrawMode]       = useState(null)   // null | 'circle' | 'polygon'
  const [draftPoints, setDraftPoints] = useState([])     // polygon draft
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)

  const load = useCallback(() => {
    fetchGeofences().then(setGeofences).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  // ── Form field helper ──────────────────────────────────────────────────────
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // ── Open create form ───────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setDraftPoints([])
    setDrawMode(null)
    setError(null)
    setPanelMode('form')
  }

  // ── Open edit form ─────────────────────────────────────────────────────────
  const openEdit = (geo) => {
    setForm({
      name:           geo.name,
      color:          geo.color,
      type:           geo.type,
      center_lat:     geo.center_lat ?? '',
      center_lng:     geo.center_lng ?? '',
      radius_meters:  geo.radius_meters ?? 500,
      coordinates:    geo.coordinates ?? [],
      alert_on_enter: geo.alert_on_enter,
      alert_on_exit:  geo.alert_on_exit,
    })
    setEditTarget(geo.uuid)
    setDraftPoints(geo.coordinates ?? [])
    setDrawMode(null)
    setError(null)
    setPanelMode('form')
  }

  // ── Map click handlers while drawing ──────────────────────────────────────
  const onCircleClick = (lat, lng) => {
    setField('center_lat', lat)
    setField('center_lng', lng)
    setDrawMode(null) // one click is enough
  }

  const onPolygonClick = (lat, lng) => {
    setDraftPoints((pts) => {
      const next = [...pts, [lat, lng]]
      setForm((f) => ({ ...f, coordinates: next }))
      return next
    })
  }

  const finishPolygon = () => {
    if (draftPoints.length < 3) return
    setForm((f) => ({ ...f, coordinates: draftPoints }))
    setDrawMode(null)
  }

  const undoLastPoint = () => {
    setDraftPoints((pts) => {
      const next = pts.slice(0, -1)
      setForm((f) => ({ ...f, coordinates: next }))
      return next
    })
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      name:           form.name,
      color:          form.color,
      type:           form.type,
      alert_on_enter: form.alert_on_enter,
      alert_on_exit:  form.alert_on_exit,
      ...(form.type === 'circle'
        ? { center_lat: Number(form.center_lat), center_lng: Number(form.center_lng), radius_meters: Number(form.radius_meters) }
        : { coordinates: form.coordinates.map(([lat, lng]) => [lng, lat]) }), // flip back to [lng,lat] for PostGIS
    }

    try {
      if (editTarget) {
        await updateGeofence(editTarget, payload)
      } else {
        await createGeofence(payload)
      }
      load()
      setPanelMode('list')
      setDraftPoints([])
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const remove = async (geo) => {
    if (!confirm(`Supprimer « ${geo.name} » ?`)) return
    await deleteGeofence(geo.uuid)
    if (selected?.uuid === geo.uuid) setSelected(null)
    load()
  }

  // ── Cursor style while drawing ─────────────────────────────────────────────
  const mapCursor = drawMode ? 'crosshair' : 'grab'

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel ───────────────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">

        {panelMode === 'list' ? (
          <>
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-400" />
                <h2 className="text-white font-semibold text-sm">Géozones</h2>
                <span className="text-xs bg-slate-800 text-slate-400 rounded-full px-2 py-0.5">
                  {geofences.length}
                </span>
              </div>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500
                           text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {geofences.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                  <Shield className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-slate-500 text-sm">Aucune geozone</p>
                  <p className="text-slate-600 text-xs mt-1">Cliquez sur « Nouvelle » pour créer une zone</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {geofences.map((geo) => (
                    <div key={geo.uuid} className="group">
                      <GeoItem
                        geo={geo}
                        selected={selected?.uuid === geo.uuid}
                        onSelect={setSelected}
                        onEdit={openEdit}
                        onDelete={remove}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── Form panel ── */
          <form onSubmit={save} className="flex flex-col h-full overflow-hidden">
            {/* Form header */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
              <h2 className="text-white font-semibold text-sm">
                {editTarget ? 'Modifier la zone' : 'Nouvelle geozone'}
              </h2>
              <button
                type="button"
                onClick={() => { setPanelMode('list'); setDrawMode(null); setDraftPoints([]) }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {error && (
                <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nom de la zone</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                             text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-1
                             focus:ring-brand-500 transition"
                  placeholder="Ex: Dépôt Central"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Couleur</label>
                <ColorPicker value={form.color} onChange={(c) => setField('color', c)} />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Type de zone</label>
                <div className="grid grid-cols-2 gap-2">
                  {['circle', 'polygon'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setField('type', t); setDraftPoints([]); setDrawMode(null) }}
                      className={`py-2 rounded-lg text-sm font-medium border transition ${
                        form.type === t
                          ? 'bg-brand-600/20 border-brand-500 text-brand-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {t === 'circle' ? 'Cercle' : 'Polygone'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Circle fields */}
              {form.type === 'circle' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setDrawMode(drawMode === 'circle' ? null : 'circle')}
                    className={`w-full py-2 rounded-lg text-sm font-medium border transition ${
                      drawMode === 'circle'
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-brand-500'
                    }`}
                  >
                    {drawMode === 'circle' ? '🎯 Cliquez sur la carte…' : 'Placer le centre sur la carte'}
                  </button>
                  {form.center_lat && (
                    <p className="text-xs text-slate-500 text-center">
                      Centre : {Number(form.center_lat).toFixed(5)}, {Number(form.center_lng).toFixed(5)}
                    </p>
                  )}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Rayon (mètres)</label>
                    <input
                      type="number"
                      min="10"
                      required
                      value={form.radius_meters}
                      onChange={(e) => setField('radius_meters', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                                 text-white text-sm focus:outline-none focus:border-brand-500
                                 focus:ring-1 focus:ring-brand-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Polygon fields */}
              {form.type === 'polygon' && (
                <div className="space-y-3">
                  {drawMode === 'polygon' ? (
                    <div className="space-y-2">
                      <p className="text-xs text-brand-400 text-center">
                        Cliquez sur la carte pour ajouter des points ({draftPoints.length} point{draftPoints.length !== 1 ? 's' : ''})
                      </p>
                      <div className="flex gap-2">
                        <button type="button" onClick={undoLastPoint}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
                        >
                          ↩ Annuler dernier
                        </button>
                        <button type="button" onClick={finishPolygon} disabled={draftPoints.length < 3}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40
                                     text-white text-xs font-medium rounded-lg transition"
                        >
                          <Check className="w-3.5 h-3.5 inline mr-1" />
                          Terminer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDrawMode('polygon')}
                      className="w-full py-2 bg-slate-800 border border-slate-700 hover:border-brand-500
                                 text-slate-300 text-sm rounded-lg transition"
                    >
                      {form.coordinates?.length >= 3 ? `✓ ${form.coordinates.length} points — Redessiner` : 'Dessiner le polygone sur la carte'}
                    </button>
                  )}
                </div>
              )}

              {/* Alerts */}
              <div>
                <label className="block text-xs text-slate-400 mb-2 font-medium">Alertes</label>
                <div className="space-y-2">
                  {[
                    { key: 'alert_on_enter', label: 'Alerte à l\'entrée' },
                    { key: 'alert_on_exit',  label: 'Alerte à la sortie' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(e) => setField(key, e.target.checked)}
                        className="w-4 h-4 rounded accent-brand-500"
                      />
                      <span className="text-sm text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Form footer */}
            <div className="px-4 pb-4 pt-3 border-t border-slate-800 flex-shrink-0">
              <button
                type="submit"
                disabled={saving || (form.type === 'circle' && !form.center_lat) || (form.type === 'polygon' && form.coordinates?.length < 3)}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40
                           disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {saving ? 'Enregistrement…' : editTarget ? 'Mettre à jour' : 'Créer la zone'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative" style={{ cursor: mapCursor }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          zoomControl={false}
          className="w-full h-full"
          preferCanvas={false}
        >
          <TileLayer url={TILE.url} attribution={TILE.attribution} />
          <ZoomControl position="bottomright" />

          <DrawHandler
            mode={drawMode}
            onCircleClick={onCircleClick}
            onPolygonClick={onPolygonClick}
          />

          {/* Existing geofences */}
          {geofences.map((geo) => {
            const isSelected = selected?.uuid === geo.uuid
            const opts = {
              color: geo.color,
              fillColor: geo.color,
              fillOpacity: isSelected ? 0.25 : 0.12,
              weight: isSelected ? 2.5 : 1.5,
            }
            if (geo.type === 'circle' && geo.center_lat) {
              return (
                <Circle
                  key={geo.uuid}
                  center={[geo.center_lat, geo.center_lng]}
                  radius={geo.radius_meters}
                  pathOptions={opts}
                  eventHandlers={{ click: () => setSelected(geo) }}
                />
              )
            }
            if (geo.type === 'polygon' && geo.coordinates?.length) {
              return (
                <Polygon
                  key={geo.uuid}
                  positions={geo.coordinates}
                  pathOptions={opts}
                  eventHandlers={{ click: () => setSelected(geo) }}
                />
              )
            }
            return null
          })}

          {/* Draft circle preview */}
          {panelMode === 'form' && form.type === 'circle' && form.center_lat && (
            <Circle
              center={[Number(form.center_lat), Number(form.center_lng)]}
              radius={Number(form.radius_meters) || 500}
              pathOptions={{ color: form.color, fillColor: form.color, fillOpacity: 0.2, weight: 2, dashArray: '6 4' }}
            />
          )}

          {/* Draft polygon preview */}
          {panelMode === 'form' && form.type === 'polygon' && draftPoints.length > 0 && (
            <>
              <Polyline positions={draftPoints} pathOptions={{ color: form.color, weight: 2, dashArray: '6 4' }} />
              {draftPoints.map((pt, i) => (
                <Marker key={i} position={pt} icon={crosshairIcon} />
              ))}
            </>
          )}
        </MapContainer>

        {/* Hint overlay while drawing */}
        {drawMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]
                          bg-slate-900/90 backdrop-blur border border-brand-500/40
                          rounded-xl px-4 py-2 text-sm text-brand-300 pointer-events-none">
            {drawMode === 'circle'
              ? 'Cliquez pour placer le centre du cercle'
              : 'Cliquez pour ajouter des points au polygone'}
          </div>
        )}
      </div>
    </div>
  )
}
