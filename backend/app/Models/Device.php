<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Device extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id', 'assigned_user_id', 'traccar_unique_id', 'traccar_id',
        'name', 'plate_number', 'make', 'model', 'year', 'color', 'vehicle_type',
        'status', 'last_speed', 'last_lat', 'last_lng', 'last_angle',
        'ignition', 'gsm_signal', 'battery_level',
        'last_seen_at', 'last_moved_at', 'is_active', 'attributes',
    ];

    protected $casts = [
        'ignition'      => 'boolean',
        'is_active'     => 'boolean',
        'attributes'    => 'array',
        'last_seen_at'  => 'datetime',
        'last_moved_at' => 'datetime',
        'last_speed'    => 'float',
        'last_lat'      => 'float',
        'last_lng'      => 'float',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn (self $model) => $model->uuid ??= Str::uuid());
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function positions(): HasMany
    {
        return $this->hasMany(Position::class)->orderByDesc('device_time');
    }

    public function latestPosition(): HasOne
    {
        return $this->hasOne(Position::class)->latestOfMany('device_time');
    }

    public function trips(): HasMany
    {
        return $this->hasMany(Trip::class)->orderByDesc('started_at');
    }

    public function geofences(): BelongsToMany
    {
        return $this->belongsToMany(Geofence::class, 'device_geofence');
    }

    public function geofenceEvents(): HasMany
    {
        return $this->hasMany(GeofenceEvent::class)->orderByDesc('occurred_at');
    }

    public function updateLiveState(array $positionData): void
    {
        $this->update([
            'last_lat'      => $positionData['latitude'],
            'last_lng'      => $positionData['longitude'],
            'last_speed'    => $positionData['speed'],
            'last_angle'    => $positionData['angle'],
            'ignition'      => $positionData['attributes']['ignition'] ?? $this->ignition,
            'gsm_signal'    => $positionData['attributes']['gsm'] ?? $this->gsm_signal,
            'battery_level' => $positionData['attributes']['battery'] ?? $this->battery_level,
            'status'        => $this->resolveStatus($positionData),
            'last_seen_at'  => $positionData['device_time'],
            'last_moved_at' => $positionData['speed'] > 2 ? $positionData['device_time'] : $this->last_moved_at,
        ]);
    }

    private function resolveStatus(array $data): string
    {
        if ($data['speed'] > 2) {
            return 'moving';
        }

        $ignition = $data['attributes']['ignition'] ?? false;

        return $ignition ? 'idle' : 'stopped';
    }
}
