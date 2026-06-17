<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Position extends Model
{
    public $timestamps = false; // uses server_time column instead

    protected $fillable = [
        'device_id', 'company_id', 'latitude', 'longitude', 'altitude',
        'speed', 'angle', 'accuracy', 'ignition', 'gsm_signal',
        'battery_level', 'attributes', 'trip_id', 'device_time', 'server_time',
    ];

    protected $casts = [
        'ignition'    => 'boolean',
        'attributes'  => 'array',
        'device_time' => 'datetime',
        'server_time' => 'datetime',
        'latitude'    => 'float',
        'longitude'   => 'float',
        'altitude'    => 'float',
        'speed'       => 'float',
        'accuracy'    => 'float',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }
}
