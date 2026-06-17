<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\ExportReport;
use App\Models\Device;
use App\Models\Trip;
use App\Models\Position;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * GET /api/v1/reports/mileage
     * Aggregated km per device for a date range.
     */
    public function mileage(Request $request): JsonResponse
    {
        $request->validate([
            'date_from'  => 'required|date',
            'date_to'    => 'required|date|after_or_equal:date_from',
            'device_ids' => 'nullable|array',
            'device_ids.*' => 'integer|exists:devices,id',
        ]);

        $companyId = $request->user()->company_id;

        $data = Trip::where('company_id', $companyId)
            ->where('is_complete', true)
            ->whereBetween('started_at', [$request->date_from, $request->date_to . ' 23:59:59'])
            ->when($request->device_ids, fn ($q) => $q->whereIn('device_id', $request->device_ids))
            ->with('device:id,name,plate_number')
            ->select(
                'device_id',
                DB::raw('COUNT(*) as trip_count'),
                DB::raw('SUM(distance_km) as total_km'),
                DB::raw('MAX(max_speed) as max_speed'),
                DB::raw('AVG(avg_speed) as avg_speed'),
                DB::raw('SUM(duration_seconds) as total_seconds')
            )
            ->groupBy('device_id')
            ->get()
            ->map(fn ($row) => [
                'device'        => $row->device,
                'trip_count'    => $row->trip_count,
                'total_km'      => round($row->total_km, 2),
                'max_speed'     => round($row->max_speed, 1),
                'avg_speed'     => round($row->avg_speed, 1),
                'total_hours'   => round($row->total_seconds / 3600, 2),
            ]);

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/v1/reports/stops
     * Dwell time report: where vehicles stopped and for how long.
     */
    public function stops(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to'   => 'required|date|after_or_equal:date_from',
            'device_id' => 'required|integer|exists:devices,id',
            'min_dwell_minutes' => 'nullable|integer|min:1',
        ]);

        $minDwell = ($request->min_dwell_minutes ?? 5) * 60; // convert to seconds

        $trips = Trip::where('company_id', $request->user()->company_id)
            ->where('device_id', $request->device_id)
            ->where('is_complete', true)
            ->whereBetween('started_at', [$request->date_from, $request->date_to . ' 23:59:59'])
            ->orderBy('started_at')
            ->get(['id', 'ended_at', 'end_lat', 'end_lng', 'end_address']);

        // Build stop list: gap between consecutive trips
        $stops = [];
        for ($i = 0; $i < $trips->count() - 1; $i++) {
            $curr = $trips[$i];
            $next = $trips[$i + 1];
            $dwellSeconds = $next->started_at->diffInSeconds($curr->ended_at);

            if ($dwellSeconds >= $minDwell) {
                $stops[] = [
                    'latitude'       => $curr->end_lat,
                    'longitude'      => $curr->end_lng,
                    'address'        => $curr->end_address,
                    'arrived_at'     => $curr->ended_at,
                    'departed_at'    => $next->started_at,
                    'dwell_minutes'  => round($dwellSeconds / 60, 1),
                ];
            }
        }

        return response()->json(['data' => $stops]);
    }

    /**
     * GET /api/v1/reports/speeding
     * Positions where speed exceeded a threshold.
     */
    public function speeding(Request $request): JsonResponse
    {
        $request->validate([
            'date_from'       => 'required|date',
            'date_to'         => 'required|date|after_or_equal:date_from',
            'device_ids'      => 'nullable|array',
            'speed_threshold' => 'nullable|integer|min:1',
        ]);

        $threshold = $request->speed_threshold ?? 100; // km/h
        $companyId = $request->user()->company_id;

        $events = Position::where('company_id', $companyId)
            ->where('speed', '>', $threshold)
            ->whereBetween('device_time', [$request->date_from, $request->date_to . ' 23:59:59'])
            ->when($request->device_ids, fn ($q) => $q->whereIn('device_id', $request->device_ids))
            ->with('device:id,name,plate_number')
            ->select('device_id', 'latitude', 'longitude', 'speed', 'device_time')
            ->orderByDesc('speed')
            ->limit(500)
            ->get()
            ->map(fn ($p) => [
                'device'      => $p->device,
                'speed'       => $p->speed,
                'latitude'    => $p->latitude,
                'longitude'   => $p->longitude,
                'occurred_at' => $p->device_time,
                'excess_kmh'  => round($p->speed - $threshold, 1),
            ]);

        return response()->json(['data' => $events]);
    }

    /**
     * POST /api/v1/reports/export
     * Queues an async PDF or Excel export and returns a job ID.
     * The frontend polls GET /api/v1/reports/export/{id}/status to check progress.
     */
    public function export(Request $request): JsonResponse
    {
        $request->validate([
            'type'       => 'required|in:mileage,stops,speeding',
            'format'     => 'required|in:pdf,excel',
            'date_from'  => 'required|date',
            'date_to'    => 'required|date|after_or_equal:date_from',
            'device_ids' => 'nullable|array',
        ]);

        $jobId = (string) \Illuminate\Support\Str::uuid();

        ExportReport::dispatch(
            jobId:     $jobId,
            userId:    $request->user()->id,
            companyId: $request->user()->company_id,
            type:      $request->type,
            format:    $request->format,
            params:    $request->only('date_from', 'date_to', 'device_ids', 'speed_threshold', 'min_dwell_minutes'),
        )->onQueue('reports');

        return response()->json(['job_id' => $jobId, 'status' => 'queued'], 202);
    }

    public function exportStatus(Request $request, string $jobId): JsonResponse
    {
        $status = \Illuminate\Support\Facades\Cache::get("report_export:{$jobId}");

        if (! $status) {
            return response()->json(['status' => 'pending']);
        }

        return response()->json($status);
    }
}
