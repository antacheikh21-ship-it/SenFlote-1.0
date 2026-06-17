<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TestUserSeeder extends Seeder
{
    public function run(): void
    {
        // ── Super admin (no company) ──────────────────────────────────────────
        User::firstOrCreate(
            ['email' => 'super@senflote.sn'],
            [
                'name'       => 'Super Admin',
                'Passer123'   => Hash::make('Passer123'),
                'role'       => 'super_admin',
                'company_id' => null,
                'is_active'  => true,
            ]
        );

        // ── Test company for role demos ───────────────────────────────────────
        $company = Company::firstOrCreate(
            ['email' => 'contact@testflotte.sn'],
            [
                'name'          => 'Test Flotte SN',
                'slug'          => 'test-flotte-sn-' . Str::random(4),
                'phone'         => '+221 77 000 00 00',
                'country'       => 'SN',
                'timezone'      => 'Africa/Dakar',
                'is_active'     => true,
                'trial_ends_at' => now()->addDays(30),
            ]
        );

        $roles = [
            [
                'email' => 'admin@testflotte.sn',
                'name'  => 'Company Admin',
                'role'  => 'company_admin',
            ],
            [
                'email' => 'dispatcher@testflotte.sn',
                'name'  => 'Dispatcher',
                'role'  => 'dispatcher',
            ],
            [
                'email' => 'viewer@testflotte.sn',
                'name'  => 'Viewer',
                'role'  => 'viewer',
            ],
        ];

        foreach ($roles as $attrs) {
            User::firstOrCreate(
                ['email' => $attrs['email']],
                [
                    'name'       => $attrs['name'],
                    'Passer123'   => Hash::make('Passer123'),
                    'role'       => $attrs['role'],
                    'company_id' => $company->id,
                    'is_active'  => true,
                ]
            );
        }
    }
}
