<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Trip extends Model
{
    protected $fillable = [
        'device_id', 'company_id',
        'start_lat', 'start_lng', 'end_lat', 'end_lng',
        'start_address', 'end_address',
        'started_at', 'ended_at',
        'distance_km', 'max_speed', 'avg_speed', 'duration_seconds',
        'is_complete',
    ];

    protected $casts = [
        'started_at'  => 'datetime',
        'ended_at'    => 'datetime',
        'is_complete' => 'boolean',
        'distance_km' => 'float',
        'max_speed'   => 'float',
        'avg_speed'   => 'float',
        'start_lat'   => 'float',
        'start_lng'   => 'float',
        'end_lat'     => 'float',
        'end_lng'     => 'float',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn (self $model) => $model->uuid ??= Str::uuid());
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function positions(): HasMany
    {
        return $this->hasMany(Position::class)->orderBy('device_time');
    }

    public function getDurationFormattedAttribute(): string
    {
        $h = intdiv($this->duration_seconds, 3600);
        $m = intdiv($this->duration_seconds % 3600, 60);
        return "{$h}h {$m}min";
    }
}
