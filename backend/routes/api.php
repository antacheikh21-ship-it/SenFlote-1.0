<?php

use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\GpsIngestController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\TripController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SenFlote API — v1
|--------------------------------------------------------------------------
*/

// ── GPS Ingestion (shared-secret auth — no Sanctum) ──────────────────────────
Route::prefix('v1/gps')->group(function () {
    Route::post('ingest',        [GpsIngestController::class, 'ingest']);
    Route::post('ingest/batch',  [GpsIngestController::class, 'ingestBatch']);
    Route::post('ingest/events', [GpsIngestController::class, 'ingestEvents']);
});

// ── Payment callbacks (signed by provider — no Sanctum) ──────────────────────
Route::prefix('v1/payments')->group(function () {
    Route::post('wave/callback',         [PaymentController::class, 'waveCallback']);
    Route::post('orange-money/callback', [PaymentController::class, 'orangeMoneyCallback']);
});

// ── Auth ──────────────────────────────────────────────────────────────────────
Route::prefix('v1/auth')->group(function () {
    Route::post('login',    [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me',      [AuthController::class, 'me']);
    });
});

// ── Authenticated ─────────────────────────────────────────────────────────────
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {

    // Devices
    Route::apiResource('devices', \App\Http\Controllers\Api\V1\DeviceController::class);
    Route::get('devices/{device}/positions',        [\App\Http\Controllers\Api\V1\DeviceController::class, 'positions']);
    Route::get('devices/{device}/trips',            [\App\Http\Controllers\Api\V1\DeviceController::class, 'trips']);
    Route::patch('devices/{device}/assign-company', [\App\Http\Controllers\Api\V1\DeviceController::class, 'assignToCompany']);
    Route::patch('devices/{device}/assign-user',    [\App\Http\Controllers\Api\V1\DeviceController::class, 'assignToUser']);

    // Trips + Playback
    Route::get('trips',                       [TripController::class, 'index']);
    Route::get('trips/{trip}',                [TripController::class, 'show']);
    Route::get('trips/{trip}/positions',      [TripController::class, 'positions']);

    // Geofences
    Route::apiResource('geofences', \App\Http\Controllers\Api\V1\GeofenceController::class);
    Route::post('geofences/{geofence}/devices', [\App\Http\Controllers\Api\V1\GeofenceController::class, 'attachDevices']);
    Route::get('geofence-events', [\App\Http\Controllers\Api\V1\GeofenceEventController::class, 'index']);

    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('mileage',               [ReportController::class, 'mileage']);
        Route::get('stops',                 [ReportController::class, 'stops']);
        Route::get('speeding',              [ReportController::class, 'speeding']);
        Route::post('export',               [ReportController::class, 'export']);
        Route::get('export/{jobId}/status', [ReportController::class, 'exportStatus']);
    });

    // Plans & Subscriptions
    Route::get('plans',                              [PaymentController::class, 'plans']);
    Route::post('payments/wave/initiate',            [PaymentController::class, 'waveInitiate']);
    Route::post('payments/orange-money/initiate',    [PaymentController::class, 'orangeMoneyInitiate']);

    // Company
    Route::get('company', [\App\Http\Controllers\Api\V1\CompanyController::class, 'show']);
    Route::put('company', [\App\Http\Controllers\Api\V1\CompanyController::class, 'update']);

    // Super-admin only
    Route::prefix('admin')->middleware('super_admin')->group(function () {
        Route::get('stats',                              [AdminController::class, 'stats']);
        Route::get('companies',                          [AdminController::class, 'companies']);
        Route::get('companies/{company}',                [AdminController::class, 'showCompany']);
        Route::patch('companies/{company}/quota',        [AdminController::class, 'updateQuota']);
        Route::patch('companies/{company}/toggle',       [AdminController::class, 'toggleCompany']);
    });
});
