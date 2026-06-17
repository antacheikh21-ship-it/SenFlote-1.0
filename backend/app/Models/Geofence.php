<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Geofence extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'company_id', 'name', 'color', 'type',
        'center_lat', 'center_lng', 'radius_meters',
        'alert_on_enter', 'alert_on_exit', 'is_active',
    ];

    protected $casts = [
        'alert_on_enter' => 'boolean',
        'alert_on_exit'  => 'boolean',
        'is_active'      => 'boolean',
        'center_lat'     => 'float',
        'center_lng'     => 'float',
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

    public function devices(): BelongsToMany
    {
        return $this->belongsToMany(Device::class, 'device_geofence');
    }

    public function events(): HasMany
    {
        return $this->hasMany(GeofenceEvent::class)->orderByDesc('occurred_at');
    }
}
