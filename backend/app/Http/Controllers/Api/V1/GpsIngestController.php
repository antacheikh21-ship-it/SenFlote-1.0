<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessGpsPosition;
use App\Models\Device;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GpsIngestController extends Controller
{
    /**
     * POST /api/v1/gps/ingest
     *
     * Handles two payload formats:
     *  1. Traccar position forward (forward.url): has top-level "deviceId" (int), no "uniqueId"
     *  2. Legacy/test format: has top-level "uniqueId" (string)
     */
    public function ingest(Request $request): JsonResponse
    {
        if (! $this->isAuthorized($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $data = $request->json()->all();

        [$device, $validated] = $this->resolveDevice($data);

        if ($validated === null) {
            return response()->json(['error' => 'Invalid payload'], 422);
        }

        if (! $device) {
            Log::warning('GPS ingest: unknown device', [
                'deviceId'  => $data['deviceId'] ?? null,
                'uniqueId'  => $data['uniqueId'] ?? null,
            ]);
            return response()->json(['status' => 'ignored'], 200);
        }

        ProcessGpsPosition::dispatch($device->id, $validated)->onQueue('gps');

        return response()->json(['status' => 'queued'], 202);
    }

    /**
     * POST /api/v1/gps/ingest/batch
     */
    public function ingestBatch(Request $request): JsonResponse
    {
        if (! $this->isAuthorized($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $items = $request->json()->all();

        if (! is_array($items) || empty($items) || count($items) > 500) {
            return response()->json(['error' => 'Payload must be array[1..500]'], 422);
        }

        $queued = 0;

        foreach ($items as $item) {
            [$device, $validated] = $this->resolveDevice($item);

            if (! $device || $validated === null) {
                continue;
            }

            ProcessGpsPosition::dispatch($device->id, $validated)->onQueue('gps');
            $queued++;
        }

        return response()->json(['status' => 'queued', 'count' => $queued], 202);
    }

    /**
     * POST /api/v1/gps/ingest/events
     *
     * Receives Traccar event notifications (geofence, speeding, etc.) — ignored for now.
     */
    public function ingestEvents(Request $request): JsonResponse
    {
        if (! $this->isAuthorized($request)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return response()->json(['status' => 'ignored'], 200);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function isAuthorized(Request $request): bool
    {
        $secret = config('services.traccar.webhook_secret');

        return $request->header('X-Traccar-Secret') === $secret
            || $request->bearerToken() === $secret;
    }

    /**
     * Returns [Device|null, normalizedData|null].
     *
     * Detects Traccar position-forward format (has "deviceId", no "uniqueId") vs
     * the legacy format used for testing (has "uniqueId" at top level).
     */
    private function resolveDevice(array $data): array
    {
        // ── Traccar forward.url format ───────────────────────────────────────
        if (isset($data['deviceId']) && ! isset($data['uniqueId'])) {
            $validated = $this->normalizeTraccarPosition($data);

            if ($validated === null) {
                return [null, null];
            }

            $device = Device::where('traccar_id', $data['deviceId'])
                ->where('is_active', true)
                ->first();

            return [$device, $validated];
        }

        // ── Legacy / test format with uniqueId ───────────────────────────────
        $validated = $this->normalizeLegacy($data);

        if ($validated === null) {
            return [null, null];
        }

        $device = Device::where('traccar_unique_id', $validated['uniqueId'])
            ->where('is_active', true)
            ->first();

        return [$device, $validated];
    }

    /**
     * Normalizes a Traccar API position object (from forward.url).
     * Speed from Traccar API is in knots → convert to km/h.
     */
    private function normalizeTraccarPosition(array $data): ?array
    {
        if (! isset($data['latitude'], $data['longitude'])) {
            return null;
        }

        $attrs = $data['attributes'] ?? [];

        return [
            'latitude'    => (float) $data['latitude'],
            'longitude'   => (float) $data['longitude'],
            'altitude'    => (float) ($data['altitude'] ?? 0),
            'speed'       => round((float) ($data['speed'] ?? 0) * 1.852, 2), // knots → km/h
            'angle'       => (int)   ($data['course'] ?? 0),
            'accuracy'    => isset($data['accuracy']) ? (float) $data['accuracy'] : null,
            'device_time' => $data['deviceTime'] ?? $data['fixTime'] ?? now()->toIso8601String(),
            'attributes'  => [
                'ignition' => $attrs['ignition'] ?? false,
                'gsm'      => $attrs['gsm'] ?? $attrs['rssi'] ?? null,
                'battery'  => $attrs['batteryLevel'] ?? $attrs['battery'] ?? null,
            ],
        ];
    }

    /**
     * Normalizes the legacy test format (uniqueId at top level).
     */
    private function normalizeLegacy(array $data): ?array
    {
        if (empty($data['uniqueId']) || ! isset($data['latitude'], $data['longitude'])) {
            return null;
        }

        return [
            'uniqueId'    => (string) $data['uniqueId'],
            'latitude'    => (float)  $data['latitude'],
            'longitude'   => (float)  $data['longitude'],
            'altitude'    => (float)  ($data['altitude']  ?? 0),
            'speed'       => (float)  ($data['speed']     ?? 0),
            'angle'       => (int)    ($data['angle']     ?? 0),
            'accuracy'    => isset($data['accuracy']) ? (float) $data['accuracy'] : null,
            'device_time' => $data['deviceTime'] ?? $data['device_time'] ?? now()->toIso8601String(),
            'attributes'  => $data['attributes'] ?? [],
        ];
    }
}
