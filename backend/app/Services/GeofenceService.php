<?php

namespace App\Services;

use App\Events\GeofenceTriggered;
use App\Models\Device;
use App\Models\Geofence;
use App\Models\GeofenceEvent;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GeofenceService
{
    /**
     * Check all active geofences assigned to the device.
     * Compares the new position against the device's previous position to
     * detect state transitions (outside→inside = enter, inside→outside = exit).
     *
     * Uses PostGIS ST_Contains / ST_DWithin for spatial containment.
     * The previous state is derived from the last stored geofence_event per geofence.
     */
    public function checkDevice(Device $device, array $newPosition): void
    {
        $geofences = $device->geofences()
            ->where('is_active', true)
            ->get();

        if ($geofences->isEmpty()) {
            return;
        }

        foreach ($geofences as $geofence) {
            try {
                $this->evaluateGeofence($device, $geofence, $newPosition);
            } catch (\Throwable $e) {
                Log::error('GeofenceService error', [
                    'device_id'   => $device->id,
                    'geofence_id' => $geofence->id,
                    'error'       => $e->getMessage(),
                ]);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function evaluateGeofence(Device $device, Geofence $geofence, array $position): void
    {
        $isInsideNow = $this->isPointInsideGeofence(
            $position['latitude'],
            $position['longitude'],
            $geofence
        );

        $wasInsideBefore = $this->wasInsideBefore($device->id, $geofence->id);

        if ($isInsideNow === $wasInsideBefore) {
            return; // No transition — nothing to do
        }

        $eventType = $isInsideNow ? 'enter' : 'exit';

        // Only alert if the geofence has alerts enabled for this event type
        $shouldAlert = $eventType === 'enter'
            ? $geofence->alert_on_enter
            : $geofence->alert_on_exit;

        $event = GeofenceEvent::create([
            'device_id'    => $device->id,
            'geofence_id'  => $geofence->id,
            'company_id'   => $device->company_id,
            'event_type'   => $eventType,
            'latitude'     => $position['latitude'],
            'longitude'    => $position['longitude'],
            'speed'        => $position['speed'],
            'occurred_at'  => $position['device_time'],
            'notification_sent' => false,
        ]);

        if ($shouldAlert) {
            event(new GeofenceTriggered($event));
        }
    }

    /**
     * Returns true if the point falls inside the geofence using PostGIS.
     * Handles both polygon areas (ST_Contains) and circle geofences (ST_DWithin).
     */
    private function isPointInsideGeofence(float $lat, float $lng, Geofence $geofence): bool
    {
        if ($geofence->type === 'circle') {
            return $this->isInsideCircle($lat, $lng, $geofence);
        }

        return $this->isInsidePolygon($lat, $lng, $geofence);
    }

    private function isInsidePolygon(float $lat, float $lng, Geofence $geofence): bool
    {
        $result = DB::selectOne(
            "SELECT ST_Contains(
                geofences.area::geometry,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
             ) AS inside
             FROM geofences
             WHERE id = :id",
            ['lat' => $lat, 'lng' => $lng, 'id' => $geofence->id]
        );

        return (bool) ($result?->inside ?? false);
    }

    private function isInsideCircle(float $lat, float $lng, Geofence $geofence): bool
    {
        // ST_DWithin on geography uses metres natively
        $result = DB::selectOne(
            "SELECT ST_DWithin(
                ST_SetSRID(ST_MakePoint(:clng, :clat), 4326)::geography,
                ST_SetSRID(ST_MakePoint(:plng, :plat), 4326)::geography,
                :radius
             ) AS inside",
            [
                'clat'   => $geofence->center_lat,
                'clng'   => $geofence->center_lng,
                'plat'   => $lat,
                'plng'   => $lng,
                'radius' => $geofence->radius_meters,
            ]
        );

        return (bool) ($result?->inside ?? false);
    }

    /**
     * Derive the device's previous state relative to a geofence by looking at
     * the most recent GeofenceEvent record. If none exists we assume outside.
     */
    private function wasInsideBefore(int $deviceId, int $geofenceId): bool
    {
        $lastEvent = GeofenceEvent::where('device_id', $deviceId)
            ->where('geofence_id', $geofenceId)
            ->orderByDesc('occurred_at')
            ->value('event_type');

        // If last event was 'enter', the device was inside before this position
        return $lastEvent === 'enter';
    }
}
