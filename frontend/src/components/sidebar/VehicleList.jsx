import { useFilteredDevices } from '@/stores/deviceStore'
import VehicleCard from './VehicleCard'
import { Truck } from 'lucide-react'

export default function VehicleList() {
  const devices = useFilteredDevices()

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
        <Truck className="w-10 h-10 opacity-30" />
        <p className="text-sm">Aucun véhicule trouvé</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {devices.map((device) => (
        <li key={device.uuid}>
          <VehicleCard device={device} />
        </li>
      ))}
    </ul>
  )
}
