<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\Device;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TripController extends Controller
{
    /** GET /api/v1/trips — list trips for the authenticated company */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'device_id'  => 'nullable|integer|exists:devices,id',
            'date_from'  => 'nullable|date',
            'date_to'    => 'nullable|date|after_or_equal:date_from',
            'per_page'   => 'nullable|integer|min:1|max:100',
        ]);

        $trips = Trip::where('company_id', $request->user()->company_id)
            ->when($request->device_id, fn ($q) => $q->where('device_id', $request->device_id))
            ->when($request->date_from, fn ($q) => $q->where('started_at', '>=', $request->date_from))
            ->when($request->date_to,   fn ($q) => $q->where('started_at', '<=', $request->date_to . ' 23:59:59'))
            ->with(['device:id,name,plate_number'])
            ->orderByDesc('started_at')
            ->paginate($request->per_page ?? 20);

        return response()->json($trips);
    }

    /** GET /api/v1/trips/{trip} — trip summary */
    public function show(Request $request, Trip $trip): JsonResponse
    {
        $this->authorizeCompany($request, $trip->company_id);

        return response()->json([
            'data' => $trip->load('device:id,name,plate_number,vehicle_type'),
        ]);
    }

    /**
     * GET /api/v1/trips/{trip}/positions
     * Returns the ordered position breadcrumbs for map playback.
     * Downsamples to max 500 points for large trips.
     */
    public function positions(Request $request, Trip $trip): JsonResponse
    {
        $this->authorizeCompany($request, $trip->company_id);

        $positions = $trip->positions()
            ->select('id', 'latitude', 'longitude', 'speed', 'angle', 'device_time', 'ignition')
            ->orderBy('device_time')
            ->get();

        // Downsample if too dense (Ramer–Douglas–Peucker would be ideal — using modulo here for simplicity)
        if ($positions->count() > 500) {
            $step      = (int) ceil($positions->count() / 500);
            $positions = $positions->filter(fn ($_, $i) => $i % $step === 0)->values();
        }

        return response()->json(['data' => $positions]);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function authorizeCompany(Request $request, int $companyId): void
    {
        if (
            ! $request->user()->isSuperAdmin() &&
            $request->user()->company_id !== $companyId
        ) {
            abort(403, 'Forbidden');
        }
    }
}
