# SenFlote — GPS Tracking SaaS

## Stack
- **Backend:** Laravel 11, PHP 8.3, PostgreSQL 16 + PostGIS 3.4, Redis 7
- **GPS Server:** Traccar (self-hosted)
- **Realtime:** Laravel Echo + Pusher-compatible (Soketi)
- **Queue:** Redis via Laravel Horizon (or plain `queue:work`)

## Quick Start

```bash
cp .env.example .env
# Fill APP_KEY, DB_PASSWORD, TRACCAR_WEBHOOK_SECRET

docker compose up -d --build

# Run inside the app container:
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
```

## Architecture — Data Flow

```
GPS Device → Traccar (port 5001/5027/...) 
           → POST /api/v1/gps/ingest  (shared-secret auth)
           → GpsIngestController      (validates + resolves device)
           → ProcessGpsPosition Job   (Redis queue: gps)
              ├─ Persist Position (PostGIS point auto-computed via trigger)
              ├─ Update Device live state
              ├─ GeofenceService.checkDevice() — PostGIS ST_Contains / ST_DWithin
              │   └─ GeofenceEvent::create()  + broadcast GeofenceTriggered
              └─ broadcast VehiclePositionUpdated → React frontend via WebSocket
```

## Key Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Full stack orchestration |
| `docker/traccar/traccar.xml` | Traccar config with event.forward webhook |
| `database/migrations/` | All schema including PostGIS columns |
| `app/Jobs/ProcessGpsPosition.php` | Core queue job |
| `app/Services/GeofenceService.php` | PostGIS-based geofencing |
| `app/Events/VehiclePositionUpdated.php` | WebSocket broadcast payload |
| `routes/api.php` | All API routes |

## Subscription Plans (CFA Franc)

| Plan | Vehicles | Price/month |
|------|----------|-------------|
| Basic | 5 | 15,000 XOF |
| Pro | 25 | 45,000 XOF |
| Enterprise | Unlimited | 120,000 XOF |

## Payment Providers
- **Wave** — `POST /api/v1/payments/wave/callback`
- **Orange Money** — `POST /api/v1/payments/orange-money/callback`
