import L from 'leaflet'

const STATUS_COLOR = {
  moving:  '#34d399', // emerald-400
  idle:    '#fbbf24', // amber-400
  stopped: '#f87171', // rose-400
  offline: '#64748b', // slate-500
}

/**
 * Generates an SVG-based Leaflet DivIcon for a vehicle.
 * The arrow is rotated by `angle` degrees so it points in the direction of travel.
 */
export function createVehicleIcon(status, angle = 0) {
  const color = STATUS_COLOR[status] ?? STATUS_COLOR.offline

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <!-- Shadow -->
      <ellipse cx="18" cy="32" rx="7" ry="2.5" fill="rgba(0,0,0,0.35)" />
      <!-- Body — rotated by angle -->
      <g transform="rotate(${angle}, 18, 18)">
        <!-- Direction arrow -->
        <polygon points="18,4 23,14 18,12 13,14" fill="${color}" opacity="0.9"/>
        <!-- Vehicle circle -->
        <circle cx="18" cy="20" r="8" fill="${color}" stroke="#0f172a" stroke-width="2"/>
        <!-- Dot centre -->
        <circle cx="18" cy="20" r="2.5" fill="#0f172a"/>
      </g>
    </svg>
  `

  return L.divIcon({
    className:  'vehicle-marker-icon',
    html:       svg,
    iconSize:   [36, 36],
    iconAnchor: [18, 20],
    popupAnchor:[0, -22],
  })
}
