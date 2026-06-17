<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name'           => 'Basic',
                'slug'           => 'basic',
                'max_vehicles'   => 5,
                'max_geofences'  => 5,
                'history_days'   => 30,
                'has_reports'    => false,
                'has_playback'   => false,
                'has_api_access' => false,
                'price_xof'      => 15000,
            ],
            [
                'name'           => 'Pro',
                'slug'           => 'pro',
                'max_vehicles'   => 25,
                'max_geofences'  => 50,
                'history_days'   => 90,
                'has_reports'    => true,
                'has_playback'   => true,
                'has_api_access' => false,
                'price_xof'      => 45000,
            ],
            [
                'name'           => 'Enterprise',
                'slug'           => 'enterprise',
                'max_vehicles'   => 9999,
                'max_geofences'  => 9999,
                'history_days'   => 365,
                'has_reports'    => true,
                'has_playback'   => true,
                'has_api_access' => true,
                'price_xof'      => 120000,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], $plan);
        }
    }
}
