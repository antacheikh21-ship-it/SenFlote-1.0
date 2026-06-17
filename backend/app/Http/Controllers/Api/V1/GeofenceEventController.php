<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GeofenceEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GeofenceEventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $events = GeofenceEvent::where('company_id', $request->user()->company_id)
            ->with(['device:id,uuid,name,plate_number', 'geofence:id,uuid,name,color'])
            ->orderByDesc('occurred_at')
            ->limit(200)
            ->get()
            ->map(fn ($ev) => [
                'id'          => $ev->id,
                'event_type'  => $ev->event_type,
                'latitude'    => $ev->latitude,
                'longitude'   => $ev->longitude,
                'speed'       => $ev->speed,
                'occurred_at' => $ev->occurred_at?->toIso8601String(),
                'device'      => $ev->device ? [
                    'uuid'         => $ev->device->uuid,
                    'name'         => $ev->device->name,
                    'plate_number' => $ev->device->plate_number,
                ] : null,
                'geofence'    => $ev->geofence ? [
                    'uuid'  => $ev->geofence->uuid,
                    'name'  => $ev->geofence->name,
                    'color' => $ev->geofence->color,
                ] : null,
            ]);

        return response()->json(['data' => $events]);
    }
}
