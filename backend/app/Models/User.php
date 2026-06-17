<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'company_id', 'name', 'email', 'phone', 'password',
        'role', 'avatar_url', 'locale', 'is_active', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at'     => 'datetime',
        'is_active'         => 'boolean',
        'password'          => 'hashed',
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

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isCompanyAdmin(): bool
    {
        return in_array($this->role, ['super_admin', 'company_admin']);
    }

    public function canManageDevices(): bool
    {
        return in_array($this->role, ['super_admin', 'company_admin', 'dispatcher']);
    }
}
