<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $devices = Device::query()
            ->when($user->isSuperAdmin(), fn ($q) => $q,  // super admin sees all
                fn ($q) => $q->where('company_id', $user->company_id)
                              ->when(
                                  in_array($user->role, ['viewer', 'dispatcher']),
                                  fn ($q2) => $q2->where(function ($q3) use ($user) {
                                      $q3->whereNull('assigned_user_id')
                                         ->orWhere('assigned_user_id', $user->id);
                                  })
                              )
            )
            ->orderBy('name')
            ->get()
            ->map(fn (Device $d) => $this->deviceData($d));

        return response()->json(['data' => $devices]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'traccar_unique_id' => ['required', 'string', 'max:50', 'unique:devices,traccar_unique_id'],
            'traccar_device_id' => ['nullable', 'integer'],
            'name'              => ['required', 'string', 'max:100'],
            'plate_number'      => ['nullable', 'string', 'max:20'],
            'make'              => ['nullable', 'string', 'max:50'],
            'model'             => ['nullable', 'string', 'max:50'],
            'year'              => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'color'             => ['nullable', 'string', 'max:30'],
            'vehicle_type'      => ['nullable', 'in:car,truck,motorcycle,bus,other'],
        ]);

        // Super admins create unassigned devices (pool); others get their company
        $device = Device::create(array_merge($data, [
            'company_id' => $user->isSuperAdmin() ? null : $user->company_id,
        ]));

        return response()->json(['data' => $this->deviceData($device->fresh())], 201);
    }

    public function show(Request $request, Device $device): JsonResponse
    {
        $this->authorizeDevice($request, $device);

        return response()->json(['data' => $this->deviceData($device)]);
    }

    public function update(Request $request, Device $device): JsonResponse
    {
        $this->authorizeDevice($request, $device);

        $data = $request->validate([
            'name'         => ['sometimes', 'string', 'max:100'],
            'plate_number' => ['nullable', 'string', 'max:20'],
            'make'         => ['nullable', 'string', 'max:50'],
            'model'        => ['nullable', 'string', 'max:50'],
            'year'         => ['nullable', 'integer', 'min:1990', 'max:2100'],
            'color'        => ['nullable', 'string', 'max:30'],
            'vehicle_type' => ['nullable', 'in:car,truck,motorcycle,bus,other'],
            'is_active'    => ['sometimes', 'boolean'],
        ]);

        $device->update($data);

        return response()->json(['data' => $this->deviceData($device->fresh())]);
    }

    public function destroy(Request $request, Device $device): JsonResponse
    {
        $this->authorizeDevice($request, $device);

        $device->delete();

        return response()->json(['message' => 'Véhicule supprimé.']);
    }

    /**
     * Super admin assigns a device to a company (moves it out of the pool).
     * Pass company_uuid=null to return it to the pool.
     */
    public function assignToCompany(Request $request, Device $device): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $data = $request->validate([
            'company_uuid'      => ['nullable', 'uuid', 'exists:companies,uuid'],
            'assigned_user_uuid' => ['nullable', 'uuid'],
        ]);

        $companyId = null;
        if ($data['company_uuid'] ?? null) {
            $companyId = \App\Models\Company::where('uuid', $data['company_uuid'])->value('id');
        }

        $assignedUserId = null;
        if ($data['assigned_user_uuid'] ?? null) {
            $assignedUserId = User::where('uuid', $data['assigned_user_uuid'])
                ->where('company_id', $companyId)
                ->value('id');
            abort_if($assignedUserId === null, 422, 'User does not belong to the target company.');
        }

        $device->update([
            'company_id'        => $companyId,
            'assigned_user_id'  => $assignedUserId,
        ]);

        return response()->json(['data' => $this->deviceData($device->fresh())]);
    }

    /**
     * Company admin assigns a device to one of their users (or clears the assignment).
     */
    public function assignToUser(Request $request, Device $device): JsonResponse
    {
        $this->authorizeDevice($request, $device);
        abort_unless(in_array($request->user()->role, ['company_admin', 'super_admin']), 403);

        $data = $request->validate([
            'assigned_user_uuid' => ['nullable', 'uuid'],
        ]);

        $assignedUserId = null;
        if ($data['assigned_user_uuid'] ?? null) {
            $assignedUserId = User::where('uuid', $data['assigned_user_uuid'])
                ->where('company_id', $device->company_id)
                ->value('id');
            abort_if($assignedUserId === null, 422, 'User does not belong to this company.');
        }

        $device->update(['assigned_user_id' => $assignedUserId]);

        return response()->json(['data' => $this->deviceData($device->fresh())]);
    }

    public function positions(Request $request, Device $device): JsonResponse
    {
        $this->authorizeDevice($request, $device);

        $request->validate([
            'from'  => ['nullable', 'date'],
            'to'    => ['nullable', 'date'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:5000'],
        ]);

        $positions = $device->positions()
            ->when($request->from, fn ($q) => $q->where('device_time', '>=', $request->from))
            ->when($request->to,   fn ($q) => $q->where('device_time', '<=', $request->to))
            ->limit($request->integer('limit', 500))
            ->get(['id', 'latitude', 'longitude', 'speed', 'angle', 'altitude', 'device_time', 'attributes']);

        return response()->json(['data' => $positions]);
    }

    public function trips(Request $request, Device $device): JsonResponse
    {
        $this->authorizeDevice($request, $device);

        $trips = $device->trips()
            ->select(['id', 'uuid', 'started_at', 'ended_at', 'distance_km', 'max_speed', 'avg_speed', 'start_address', 'end_address'])
            ->paginate(20);

        return response()->json([
            'data' => $trips->items(),
            'meta' => [
                'current_page' => $trips->currentPage(),
                'last_page'    => $trips->lastPage(),
                'total'        => $trips->total(),
            ],
        ]);
    }

    private function authorizeDevice(Request $request, Device $device): void
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) return;

        abort_if($device->company_id !== $user->company_id, 403);
    }

    private function deviceData(Device $device): array
    {
        return [
            'uuid'              => $device->uuid,
            'traccar_unique_id' => $device->traccar_unique_id,
            'name'              => $device->name,
            'plate_number'      => $device->plate_number,
            'make'              => $device->make,
            'model'             => $device->model,
            'year'              => $device->year,
            'color'             => $device->color,
            'vehicle_type'      => $device->vehicle_type,
            'status'            => $device->status,
            'last_speed'        => $device->last_speed,
            'last_lat'          => $device->last_lat,
            'last_lng'          => $device->last_lng,
            'last_angle'        => $device->last_angle,
            'ignition'          => $device->ignition,
            'gsm_signal'        => $device->gsm_signal,
            'battery_level'     => $device->battery_level,
            'last_seen_at'      => $device->last_seen_at?->toIso8601String(),
            'last_moved_at'     => $device->last_moved_at?->toIso8601String(),
            'is_active'         => $device->is_active,
            'company_id'        => $device->company_id,
            'assigned_user_id'  => $device->assigned_user_id,
        ];
    }
}
