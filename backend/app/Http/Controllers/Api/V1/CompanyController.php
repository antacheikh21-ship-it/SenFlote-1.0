<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $company = $request->user()->company;

        abort_if(! $company, 404);

        return response()->json(['data' => $this->companyData($company)]);
    }

    public function update(Request $request): JsonResponse
    {
        $company = $request->user()->company;

        abort_if(! $company, 404);
        abort_if(! $request->user()->isCompanyAdmin(), 403);

        $data = $request->validate([
            'name'     => ['sometimes', 'string', 'max:100'],
            'phone'    => ['nullable', 'string', 'max:20'],
            'timezone' => ['sometimes', 'string', 'max:60'],
            'logo_url' => ['nullable', 'url'],
        ]);

        $company->update($data);

        return response()->json(['data' => $this->companyData($company->fresh())]);
    }

    private function companyData($company): array
    {
        return [
            'uuid'          => $company->uuid,
            'name'          => $company->name,
            'slug'          => $company->slug,
            'email'         => $company->email,
            'phone'         => $company->phone,
            'country'       => $company->country,
            'timezone'      => $company->timezone,
            'logo_url'      => $company->logo_url,
            'is_active'     => $company->is_active,
            'trial_ends_at' => $company->trial_ends_at?->toIso8601String(),
            'settings'      => $company->settings,
        ];
    }
}
