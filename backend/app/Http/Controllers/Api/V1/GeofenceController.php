<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\Geofence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GeofenceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $geofences = Geofence::where('company_id', $request->user()->company_id)
            ->orderBy('name')
            ->get()
            ->map(fn (Geofence $g) => $this->geofenceData($g));

        return response()->json(['data' => $geofences]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:100'],
            'color'          => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'type'           => ['required', 'in:circle,polygon'],
            'center_lat'     => ['required_if:type,circle', 'nullable', 'numeric', 'between:-90,90'],
            'center_lng'     => ['required_if:type,circle', 'nullable', 'numeric', 'between:-180,180'],
            'radius_meters'  => ['required_if:type,circle', 'nullable', 'integer', 'min:10'],
            'coordinates'    => ['required_if:type,polygon', 'nullable', 'array', 'min:3'],
            'coordinates.*'  => ['array', 'size:2'],
            'alert_on_enter' => ['sometimes', 'boolean'],
            'alert_on_exit'  => ['sometimes', 'boolean'],
            'is_active'      => ['sometimes', 'boolean'],
        ]);

        $geofence = DB::transaction(function () use ($data, $request) {
            $g = Geofence::create([
                'company_id'     => $request->user()->company_id,
                'name'           => $data['name'],
                'color'          => $data['color'] ?? '#3B82F6',
                'type'           => $data['type'],
                'center_lat'     => $data['center_lat'] ?? null,
                'center_lng'     => $data['center_lng'] ?? null,
                'radius_meters'  => $data['radius_meters'] ?? null,
                'alert_on_enter' => $data['alert_on_enter'] ?? true,
                'alert_on_exit'  => $data['alert_on_exit'] ?? true,
                'is_active'      => $data['is_active'] ?? true,
            ]);

            $this->setArea($g, $data);

            return $g->fresh();
        });

        return response()->json(['data' => $this->geofenceData($geofence)], 201);
    }

    public function show(Request $request, Geofence $geofence): JsonResponse
    {
        $this->authorizeGeofence($request, $geofence);

        return response()->json(['data' => $this->geofenceData($geofence)]);
    }

    public function update(Request $request, Geofence $geofence): JsonResponse
    {
        $this->authorizeGeofence($request, $geofence);

        $data = $request->validate([
            'name'           => ['sometimes', 'string', 'max:100'],
            'color'          => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'center_lat'     => ['nullable', 'numeric', 'between:-90,90'],
            'center_lng'     => ['nullable', 'numeric', 'between:-180,180'],
            'radius_meters'  => ['nullable', 'integer', 'min:10'],
            'coordinates'    => ['nullable', 'array', 'min:3'],
            'coordinates.*'  => ['array', 'size:2'],
            'alert_on_enter' => ['sometimes', 'boolean'],
            'alert_on_exit'  => ['sometimes', 'boolean'],
            'is_active'      => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($geofence, $data) {
            $geofence->update(array_filter($data, fn ($v, $k) => ! in_array($k, ['coordinates']), ARRAY_FILTER_USE_BOTH));

            if (isset($data['coordinates']) || (isset($data['center_lat']) && isset($data['radius_meters']))) {
                $this->setArea($geofence, array_merge(['type' => $geofence->type], $data));
            }
        });

        return response()->json(['data' => $this->geofenceData($geofence->fresh())]);
    }

    public function destroy(Request $request, Geofence $geofence): JsonResponse
    {
        $this->authorizeGeofence($request, $geofence);

        $geofence->delete();

        return response()->json(['message' => 'Zone supprimée.']);
    }

    public function attachDevices(Request $request, Geofence $geofence): JsonResponse
    {
        $this->authorizeGeofence($request, $geofence);

        $data = $request->validate([
            'device_uuids'   => ['required', 'array'],
            'device_uuids.*' => ['uuid'],
        ]);

        $deviceIds = Device::where('company_id', $request->user()->company_id)
            ->whereIn('uuid', $data['device_uuids'])
            ->pluck('id');

        $geofence->devices()->sync($deviceIds);

        return response()->json(['message' => 'Véhicules associés à la zone.']);
    }

    private function setArea(Geofence $geofence, array $data): void
    {
        if ($data['type'] === 'circle') {
            // Build a circle polygon via ST_Buffer on a geography point
            DB::statement(
                'UPDATE geofences SET area = ST_Buffer(ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?) WHERE id = ?',
                [$data['center_lng'], $data['center_lat'], $data['radius_meters'], $geofence->id]
            );
        } else {
            // Close the ring if needed
            $coords = $data['coordinates'];
            if ($coords[0] !== end($coords)) {
                $coords[] = $coords[0];
            }

            $wkt = 'POLYGON((' . implode(',', array_map(fn ($c) => "{$c[0]} {$c[1]}", $coords)) . '))';

            DB::statement(
                'UPDATE geofences SET area = ST_SetSRID(ST_GeomFromText(?), 4326)::geography WHERE id = ?',
                [$wkt, $geofence->id]
            );
        }
    }

    private function authorizeGeofence(Request $request, Geofence $geofence): void
    {
        abort_if(
            $geofence->company_id !== $request->user()->company_id
            && ! $request->user()->isSuperAdmin(),
            403
        );
    }

    private function geofenceData(Geofence $geofence): array
    {
        $coordinates = null;

        if ($geofence->type === 'polygon') {
            $row = DB::selectOne(
                'SELECT ST_AsGeoJSON(area) as geojson FROM geofences WHERE id = ?',
                [$geofence->id]
            );
            if ($row?->geojson) {
                $geo = json_decode($row->geojson, true);
                // GeoJSON polygon: coordinates[0] is the outer ring [[lng,lat],...]
                // Flip to [lat,lng] for Leaflet
                $coordinates = array_map(
                    fn($p) => [$p[1], $p[0]],
                    $geo['coordinates'][0] ?? []
                );
            }
        }

        return [
            'uuid'           => $geofence->uuid,
            'name'           => $geofence->name,
            'color'          => $geofence->color,
            'type'           => $geofence->type,
            'center_lat'     => $geofence->center_lat,
            'center_lng'     => $geofence->center_lng,
            'radius_meters'  => $geofence->radius_meters,
            'coordinates'    => $coordinates,
            'alert_on_enter' => $geofence->alert_on_enter,
            'alert_on_exit'  => $geofence->alert_on_exit,
            'is_active'      => $geofence->is_active,
        ];
    }
}
