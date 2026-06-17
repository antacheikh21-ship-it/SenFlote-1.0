<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'name', 'slug', 'max_vehicles', 'max_geofences', 'history_days',
        'has_reports', 'has_playback', 'has_api_access', 'price_xof', 'is_active',
    ];

    protected $casts = [
        'has_reports'    => 'boolean',
        'has_playback'   => 'boolean',
        'has_api_access' => 'boolean',
        'is_active'      => 'boolean',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }
}
