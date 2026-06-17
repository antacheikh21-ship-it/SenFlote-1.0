<?php

namespace App\Jobs;

use App\Events\VehiclePositionUpdated;
use App\Models\Device;
use App\Models\Position;
use App\Services\GeofenceService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessGpsPosition implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;       // seconds between retries
    public int $timeout = 30;

    public function __construct(
        private readonly int   $deviceId,
        private readonly array $data,
    ) {}

    public function handle(GeofenceService $geofenceService): void
    {
        $device = Device::find($this->deviceId);

        if (! $device || ! $device->is_active) {
            return;
        }

        DB::transaction(function () use ($device, $geofenceService) {
            // 1. Persist the position row
            $position = Position::create([
                'device_id'    => $device->id,
                'company_id'   => $device->company_id,
                'latitude'     => $this->data['latitude'],
                'longitude'    => $this->data['longitude'],
                'altitude'     => $this->data['altitude'],
                'speed'        => $this->data['speed'],
                'angle'        => $this->data['angle'],
                'accuracy'     => $this->data['accuracy'],
                'ignition'     => $this->data['attributes']['ignition'] ?? false,
                'gsm_signal'   => $this->data['attributes']['gsm'] ?? null,
                'battery_level'=> $this->data['attributes']['battery'] ?? null,
                'attributes'   => $this->data['attributes'],
                'device_time'  => $this->data['device_time'],
            ]);

            // 2. Update the denormalised live state on the device row
            $device->updateLiveState($this->data);

            // 3. Geofencing — only for assigned devices (pool devices have no company)
            if ($device->company_id !== null) {
                $geofenceService->checkDevice($device->fresh(), $this->data);
            }

            // 4. Broadcast real-time position to the frontend via WebSocket
            broadcast(new VehiclePositionUpdated($device->fresh(), $position))->toOthers();
        });
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessGpsPosition failed', [
            'device_id' => $this->deviceId,
            'error'     => $exception->getMessage(),
            'data'      => $this->data,
        ]);
    }
}
