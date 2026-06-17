<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company_name'     => ['required', 'string', 'max:100'],
            'company_email'    => ['required', 'email', 'unique:companies,email'],
            'company_phone'    => ['nullable', 'string', 'max:20'],
            'company_country'  => ['nullable', 'string', 'size:2'],
            'company_timezone' => ['nullable', 'string', 'max:60'],
            'name'             => ['required', 'string', 'max:100'],
            'email'            => ['required', 'email', 'unique:users,email'],
            'password'         => ['required', 'confirmed', Password::min(8)],
        ]);

        $company = Company::create([
            'name'          => $data['company_name'],
            'slug'          => Str::slug($data['company_name']) . '-' . Str::random(4),
            'email'         => $data['company_email'],
            'phone'         => $data['company_phone'] ?? null,
            'country'       => strtoupper($data['company_country'] ?? 'SN'),
            'timezone'      => $data['company_timezone'] ?? 'Africa/Dakar',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'name'       => $data['name'],
            'email'      => $data['email'],
            'password'   => $data['password'],
            'role'       => 'company_admin',
        ]);

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'data'  => $this->userData($user->load('company')),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Ces identifiants ne correspondent à aucun compte.'],
            ]);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'Compte désactivé.'], 403);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'data'  => $this->userData($user->load('company')),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->userData($request->user()->load('company')),
        ]);
    }

    private function userData(User $user): array
    {
        return [
            'uuid'       => $user->uuid,
            'name'       => $user->name,
            'email'      => $user->email,
            'phone'      => $user->phone,
            'role'       => $user->role,
            'locale'     => $user->locale,
            'avatar_url' => $user->avatar_url,
            'company_id' => $user->company_id,
            'company'    => $user->company ? [
                'id'            => $user->company->id,
                'uuid'          => $user->company->uuid,
                'name'          => $user->company->name,
                'slug'          => $user->company->slug,
                'email'         => $user->company->email,
                'country'       => $user->company->country,
                'timezone'      => $user->company->timezone,
                'is_active'     => $user->company->is_active,
                'trial_ends_at' => $user->company->trial_ends_at?->toIso8601String(),
                'settings'      => $user->company->settings,
            ] : null,
        ];
    }
}
