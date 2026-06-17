<?php

namespace App\Events;

use App\Models\Device;
use App\Models\Position;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VehiclePositionUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Device   $device,
        public readonly Position $position,
    ) {}

    /**
     * Scoped to the company so only the tenant's users receive updates.
     * Channel name: private-company.{id}.tracking
     */
    public function broadcastOn(): Channel
    {
        return new PrivateChannel("company.{$this->device->company_id}.tracking");
    }

    public function broadcastAs(): string
    {
        return 'vehicle.position.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'device' => [
                'id'           => $this->device->id,
                'uuid'         => $this->device->uuid,
                'name'         => $this->device->name,
                'plate_number' => $this->device->plate_number,
                'status'       => $this->device->status,
                'ignition'     => $this->device->ignition,
                'gsm_signal'   => $this->device->gsm_signal,
                'battery_level'=> $this->device->battery_level,
            ],
            'position' => [
                'latitude'    => $this->position->latitude,
                'longitude'   => $this->position->longitude,
                'speed'       => $this->position->speed,
                'angle'       => $this->position->angle,
                'altitude'    => $this->position->altitude,
                'device_time' => $this->position->device_time->toIso8601String(),
            ],
        ];
    }
}
