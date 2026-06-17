<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeofenceEvent extends Model
{
    protected $fillable = [
        'device_id', 'geofence_id', 'company_id', 'event_type',
        'latitude', 'longitude', 'speed', 'occurred_at', 'notification_sent',
    ];

    protected $casts = [
        'occurred_at'       => 'datetime',
        'notification_sent' => 'boolean',
        'latitude'          => 'float',
        'longitude'         => 'float',
        'speed'             => 'float',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function geofence(): BelongsTo
    {
        return $this->belongsTo(Geofence::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
