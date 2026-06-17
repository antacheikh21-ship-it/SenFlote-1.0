<?php

namespace App\Events;

use App\Models\GeofenceEvent;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GeofenceTriggered implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly GeofenceEvent $geofenceEvent,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("company.{$this->geofenceEvent->company_id}.alerts");
    }

    public function broadcastAs(): string
    {
        return 'geofence.triggered';
    }

    public function broadcastWith(): array
    {
        $event    = $this->geofenceEvent;
        $geofence = $event->geofence;
        $device   = $event->device;

        return [
            'event_type'    => $event->event_type,
            'occurred_at'   => $event->occurred_at->toIso8601String(),
            'geofence' => [
                'id'   => $geofence->id,
                'name' => $geofence->name,
            ],
            'device' => [
                'id'           => $device->id,
                'name'         => $device->name,
                'plate_number' => $device->plate_number,
            ],
            'location' => [
                'latitude'  => $event->latitude,
                'longitude' => $event->longitude,
                'speed'     => $event->speed,
            ],
        ];
    }
}
