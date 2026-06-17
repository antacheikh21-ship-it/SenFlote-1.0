<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Super-admin endpoints for managing tenants and their quotas.
 * All routes protected by [auth:sanctum, role:super_admin] middleware.
 */
class AdminController extends Controller
{
    /**
     * GET /api/v1/admin/companies
     * Paginated list of all tenants with usage stats.
     */
    public function companies(Request $request): JsonResponse
    {
        $companies = Company::withCount(['devices', 'users'])
            ->with([
                'activeSubscription.plan:id,name,slug,max_vehicles,max_geofences',
            ])
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->status, fn ($q) => $q->where('is_active', $request->status === 'active'))
            ->orderByDesc('created_at')
            ->paginate(25);

        return response()->json($companies);
    }

    /**
     * GET /api/v1/admin/companies/{company}
     */
    public function showCompany(Company $company): JsonResponse
    {
        $company->load([
            'activeSubscription.plan',
            'users:id,company_id,name,email,role,last_login_at',
        ]);

        $company->devices_count       = $company->devices()->count();
        $company->active_devices_count = $company->devices()->where('is_active', true)->count();

        return response()->json(['data' => $company]);
    }

    /**
     * PATCH /api/v1/admin/companies/{company}/quota
     * Override the vehicle / geofence quota for a specific company
     * without changing their plan (e.g. for enterprise custom deals).
     */
    public function updateQuota(Request $request, Company $company): JsonResponse
    {
        $request->validate([
            'max_vehicles'  => 'nullable|integer|min:0',
            'max_geofences' => 'nullable|integer|min:0',
            'history_days'  => 'nullable|integer|min:1',
        ]);

        $settings = array_filter([
            'quota_max_vehicles'  => $request->max_vehicles,
            'quota_max_geofences' => $request->max_geofences,
            'quota_history_days'  => $request->history_days,
        ], fn ($v) => $v !== null);

        $company->update([
            'settings' => array_merge($company->settings ?? [], $settings),
        ]);

        return response()->json([
            'message'  => 'Quota mis à jour',
            'settings' => $company->settings,
        ]);
    }

    /**
     * PATCH /api/v1/admin/companies/{company}/toggle
     * Activate / deactivate a tenant account.
     */
    public function toggleCompany(Company $company): JsonResponse
    {
        $company->update(['is_active' => ! $company->is_active]);

        return response()->json([
            'message'   => $company->is_active ? 'Compte activé' : 'Compte désactivé',
            'is_active' => $company->is_active,
        ]);
    }

    /**
     * GET /api/v1/admin/stats
     * Platform-level KPIs for the super-admin dashboard.
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'data' => [
                'total_companies'  => Company::count(),
                'active_companies' => Company::where('is_active', true)->count(),
                'total_devices'    => \App\Models\Device::count(),
                'active_devices'   => \App\Models\Device::where('is_active', true)->count(),
                'total_users'      => \App\Models\User::count(),
                'mrr_xof'          => $this->calculateMrr(),
                'plans_breakdown'  => $this->plansBreakdown(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function calculateMrr(): int
    {
        return (int) Subscription::where('status', 'active')
            ->with('plan:id,price_xof')
            ->get()
            ->sum(fn ($sub) => $sub->billing_cycle === 'yearly'
                ? $sub->plan->price_xof  // monthly equivalent
                : $sub->plan->price_xof
            );
    }

    private function plansBreakdown(): array
    {
        return Plan::withCount(['subscriptions' => fn ($q) => $q->where('status', 'active')])
            ->get(['id', 'name', 'slug'])
            ->map(fn ($p) => ['plan' => $p->name, 'count' => $p->subscriptions_count])
            ->toArray();
    }
}
