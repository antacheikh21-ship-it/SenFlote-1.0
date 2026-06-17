<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Subscription extends Model
{
    protected $fillable = [
        'company_id', 'plan_id', 'status', 'billing_cycle',
        'starts_at', 'ends_at', 'canceled_at',
        'payment_provider', 'payment_reference', 'meta',
    ];

    protected $casts = [
        'starts_at'   => 'datetime',
        'ends_at'     => 'datetime',
        'canceled_at' => 'datetime',
        'meta'        => 'array',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(fn (self $model) => $model->uuid ??= Str::uuid());
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['trialing', 'active']);
    }
}
