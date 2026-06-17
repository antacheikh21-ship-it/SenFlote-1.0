# CLAUDE.md — SenFlote

Fichier de référence pour Claude Code. Décrit l'architecture, les décisions techniques, et le contexte du projet afin que chaque nouvelle conversation puisse reprendre sans perdre de contexte.

---

## Contexte du projet

**SenFlote** est un SaaS de tracking GPS multi-tenant destiné au marché africain (cible initiale : Sénégal). Il permet aux entreprises de gérer leur flotte de véhicules en temps réel : localisation live, géofencing, historique de trajets, rapports, et facturation via les opérateurs de paiement mobile locaux (Wave, Orange Money).

Le produit est inspiré de WhatsGPS dans son UX (Map First), mais pensé pour le contexte africain : connectivité intermittente, flotte hétérogène, paiement mobile.

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Backend API | Laravel | 11 |
| Runtime | PHP | 8.3 |
| Base de données | PostgreSQL + PostGIS | 16 / 3.4 |
| Cache & Queue | Redis | 7.2 |
| Serveur GPS | Traccar | 6.x (latest) |
| WebSocket | Laravel Echo + Pusher-compatible (Soketi) | — |
| Frontend | React + Vite | 18 / 5 |
| CSS | Tailwind CSS | 3 |
| Carte | Leaflet + react-leaflet | 1.9 / 4.2 |
| État global | Zustand | 4 |
| HTTP client | Axios | 1.7 |
| Conteneurisation | Docker Compose | — |

---

## Architecture générale

### Infrastructure Docker (`docker-compose.yml`)

```
senflote_app       — PHP 8.3-FPM (Laravel app)
senflote_nginx     — Nginx 1.25 reverse proxy → port 8000
senflote_postgres  — PostGIS 16-3.4 → port 5432
senflote_redis     — Redis 7.2 → port 6379
senflote_traccar   — Traccar 6.x GPS server → port 8082 (UI), 5000-5150 (protocoles GPS)
senflote_worker    — Queue worker Redis --queue=gps,default (même image que app)
senflote_scheduler — Laravel scheduler (boucle 60s)
```

**IMPORTANT** : le worker écoute `--queue=gps,default`. Si tu changes la commande, les jobs GPS ne seront pas traités (ils vont sur la queue `gps`, pas `default`).

Tous les services sont sur le réseau bridge `senflote_net`. Les volumes sont nommés (`postgres_data`, `redis_data`, `traccar_data`) pour la persistance.

### Flux de données GPS (le cœur du système)

```
Tracker GPS (IMEI / OsmAnd protocol)
  → Traccar (protocole GT06, Teltonika, OsmAnd…)
  → forward.url HTTP POST → /api/v1/gps/ingest        ← forward.url (chaque position)
  → GpsIngestController (valide X-Traccar-Secret, résout Device par traccar_id)
  → ProcessGpsPosition::dispatch() → Queue Redis "gps"
  → Job:
      1. Position::create()            — persiste en BDD (trigger PostGIS auto-calcule la géographie)
      2. Device::updateLiveState()     — met à jour statut/vitesse/position sur la ligne device
      3. GeofenceService::checkDevice()— détecte entrées/sorties via ST_Contains / ST_DWithin
                                         (ignoré si device.company_id est null — pool device)
      4. broadcast(VehiclePositionUpdated) → WebSocket → React (déplace le marqueur)
```

**Traccar config** (`docker/traccar/traccar.xml`) :
- `forward.url` → `/api/v1/gps/ingest` — forwarde **chaque position GPS** reçue
- `event.forward.url` → `/api/v1/gps/ingest/events` — forwarde les événements Traccar (geofence, alerte), actuellement ignoré côté Laravel
- **Attention** : `event.forward.url` ne forwarde PAS les positions GPS (seulement les événements Traccar). Utiliser `forward.url` pour les positions.

**Format du payload** `forward.url` (Traccar natif) :
```json
{
  "deviceId": 1,           ← ID interne Traccar (→ Device.traccar_id dans notre DB)
  "latitude": 14.759,
  "longitude": -17.379,
  "altitude": 12.5,
  "speed": 0.0,            ← en nœuds (GpsIngestController convertit × 1.852 → km/h)
  "course": 90,            ← cap (→ angle)
  "deviceTime": "...",
  "attributes": { "batteryLevel": 72, "ignition": false }
}
```

`GpsIngestController` gère deux formats :
1. **Format Traccar** (`deviceId` présent, pas de `uniqueId`) → lookup par `Device.traccar_id`
2. **Format legacy/test** (`uniqueId` au top level) → lookup par `Device.traccar_unique_id`

### Modèle multi-tenant

Chaque `Company` est un tenant isolé. Toutes les entités (`devices`, `positions`, `geofences`, `trips`, etc.) portent un `company_id`. Les routes authentifiées filtrent automatiquement par `company_id` du `User` connecté. Le `super_admin` n'appartient à aucune company et peut accéder à tout via les routes `/admin`.

### Pool de devices (super admin)

Les devices peuvent être dans l'un de ces états :
- **Pool** : `company_id = null`, `assigned_user_id = null` — appartient au super admin, non assigné
- **Assigné à une company** : `company_id = X`, `assigned_user_id = null`
- **Assigné à un user** : `company_id = X`, `assigned_user_id = Y`

Le super admin voit tous les devices. Les company admins voient les devices de leur company. Les viewers/dispatchers voient uniquement les devices non assignés ou assignés à eux.

Les positions des pool devices (`company_id = null`) sont persistées (colonne nullable) mais le géofencing est ignoré.

---

## Schéma de base de données

### Tables et relations

```
companies ──< users
          ──< devices ──< positions (PostGIS point via trigger)
          ──< geofences (PostGIS polygon/circle)
          ──< subscriptions >── plans
          ──< trips ──< positions

devices >──< geofences (pivot: device_geofence)
devices ──< geofence_events
users   ──< devices (via assigned_user_id)
```

### Décisions PostGIS

- La colonne `location geography(Point, 4326)` dans `positions` est calculée automatiquement par un trigger PostgreSQL `trg_positions_set_location` à partir de `latitude`/`longitude`. Pas besoin de la gérer en PHP.
- Les `geofences` stockent leur `area geography(Geometry, 4326)` — un polygon GeoJSON converti en PostGIS côté backend lors de la création.
- Le géofencing utilise :
  - `ST_Contains(geofence.area, point)` pour les polygones
  - `ST_DWithin(center, point, radius_meters)` pour les cercles (en mètres, natif sur `geography`)
- Les index GIST sont créés manuellement via `DB::statement()` dans les migrations car Blueprint ne supporte pas les index spatiaux.

### Colonnes notables

- `devices.traccar_unique_id` — IMEI ou ID custom envoyé par le tracker. Clé de liaison OsmAnd.
- `devices.traccar_id` — ID interne Traccar (entier). Utilisé pour le lookup lors du `forward.url`.
- `devices.company_id` — **nullable** (pool devices n'appartiennent à aucune company).
- `devices.assigned_user_id` — FK nullable vers `users` (assignation à un utilisateur final).
- `devices.status` — `moving | idle | stopped | offline` — dénormalisé sur la ligne device.
- `positions.company_id` — **nullable** (pour les positions des pool devices).
- `companies.settings jsonb` — stocke les surcharges de quota admin (ex: `quota_max_vehicles`).
- `subscriptions.meta jsonb` — stocke les références de paiement spécifiques au provider.

### Route model binding

Les modèles `Device` et `Geofence` ont `getRouteKeyName()` qui retourne `'uuid'`. Les routes Laravel résolvent donc `{device}` et `{geofence}` par UUID (pas par ID numérique). Les UUIDs sont exposés vers l'extérieur, les IDs numériques restent internes.

---

## Backend Laravel — Fichiers clés

### Controllers (`backend/app/Http/Controllers/Api/V1/`)

| Fichier | Rôle |
|---------|------|
| `GpsIngestController.php` | Webhook Traccar. Auth par secret partagé (`X-Traccar-Secret`). Gère format Traccar natif (deviceId) et format legacy (uniqueId). Routes : `POST /api/v1/gps/ingest`, `/ingest/batch`, `/ingest/events`. |
| `DeviceController.php` | CRUD devices + pool management. `index()` filtre par rôle. `assignToCompany()` et `assignToUser()` pour les affectations. |
| `GeofenceEventController.php` | Retourne les 200 derniers events géofence de la company (pour la page Alertes). |
| `AuthController.php` | Login/register/me avec Sanctum. Retourne `company_id` (numérique) et `company.id` dans userData — nécessaire pour le channel WebSocket `private-company.{id}`. |
| `TripController.php` | CRUD trips + positions pour playback. Downsample automatique à 500 points. |
| `ReportController.php` | Rapports kilométrage, arrêts, survitesse. Export PDF/Excel async via job. |
| `PaymentController.php` | Initiation + callbacks Wave et Orange Money. Active la subscription sur succès. |
| `AdminController.php` | Super-admin : liste tenants, stats plateforme, override quotas, toggle company. |

### Jobs (`backend/app/Jobs/`)

| Fichier | Queue | Rôle |
|---------|-------|------|
| `ProcessGpsPosition.php` | `gps` | Cœur du système. Persiste position, met à jour device, géofencing (sauté si company_id null), broadcast. |
| `ExportReport.php` | `reports` | Génère PDF (barryvdh/laravel-dompdf) ou Excel (maatwebsite/excel). Dépendances à installer séparément. |

### Services (`backend/app/Services/`)

| Fichier | Rôle |
|---------|------|
| `GeofenceService.php` | Détecte les transitions entrée/exit via PostGIS. Dérive l'état précédent depuis le dernier `GeofenceEvent`. |
| `Payment/WavePaymentService.php` | Checkout Wave : initiation, validation HMAC webhook, statut. Mode stub si `WAVE_API_KEY` est vide. |
| `Payment/OrangeMoneyService.php` | OMWP : OAuth2 token, initiation paiement, vérification. Stub si credentials absents. |

### Events (`backend/app/Events/`)

| Événement | Channel | Déclencheur |
|-----------|---------|-------------|
| `VehiclePositionUpdated` | `private-company.{id}.tracking` | Chaque position reçue du Job |
| `GeofenceTriggered` | `private-company.{id}.alerts` | Entrée ou sortie de zone |

### Seeders

`PlanSeeder` crée les 3 plans de base :
- **Basic** — 5 véhicules, 15 000 XOF/mois
- **Pro** — 25 véhicules, rapports + playback, 45 000 XOF/mois
- **Enterprise** — illimité + API access, 120 000 XOF/mois

---

## Frontend React — Fichiers clés

### Structure `frontend/src/`

```
api/
  axios.js          — Instance Axios avec token Sanctum + intercepteur 401
  devices.js        — fetchDevices, fetchDevicePositions, fetchDeviceTrips
  trips.js          — fetchTrips, fetchTrip, fetchTripPositions
  reports.js        — fetchMileageReport, fetchStopsReport, fetchSpeedingReport, requestExport, pollExportStatus
  admin.js          — fetchAdminStats, fetchCompanies, updateQuota, toggleCompanyStatus,
                      fetchPoolDevices, assignDeviceToCompany, returnDeviceToPool

stores/
  deviceStore.js    — Zustand. Keyed par device.uuid pour update O(1) sur WebSocket.
                      Exports : useFilteredDevices(), useCounts() (hooks avec shallow equality).
                      NE PAS utiliser de getters JS dans ce store (voir Pièges).

hooks/
  useDevices.js     — Charge les devices + polling 30s (fallback offline detection)
  useEcho.js        — Singleton Laravel Echo. S'abonne à company.{id}.tracking
  usePlayback.js    — RAF loop. Avance l'index proportionnellement aux deltas device_time GPS

components/
  layout/
    AppLayout.jsx   — Shell : nav icônes verticale (desktop) + drawer mobile + Outlet
  sidebar/
    Sidebar.jsx         — Panel collapsible. Utilise useCounts() (pas s.counts)
    SearchBar.jsx       — Filtre par nom / plaque
    StatusFilter.jsx    — Tabs Moving/Idle/Offline avec compteurs live. Utilise useCounts()
    VehicleCard.jsx     — Carte véhicule : status badge, vitesse, last seen, GSM, batterie
    VehicleList.jsx     — Liste filtrée. Utilise useFilteredDevices() (pas s.filteredDevices)
  ui/
    StatusBadge.jsx     — Badge coloré + dot animé (moving pulse)
    SignalBars.jsx      — 5 barres GSM (0-5)
    BatteryBar.jsx      — Barre batterie avec couleur adaptative (vert/amber/rouge)
  map/
    TrackingMap.jsx     — MapContainer Leaflet, layers street/satellite, overlay live indicator.
                          Accepte prop geofences=[] et affiche GeofenceOverlay (Circle/Polygon).
                          Bouton toggle show/hide géozones (top-left overlay).
    VehicleMarker.jsx   — Marker avec icon SVG, flyTo + openPopup sur sélection.
                          IMPORTANT : useEffect AVANT le return null conditionnel (Rules of Hooks).
                          Sélection par device.uuid (pas device.id).
    VehiclePopup.jsx    — Popup : plaque, vitesse, ignition ON/OFF, last seen, GSM, batterie
    LayerControl.jsx    — Toggle Plan (CartoDB Dark) / Satellite (Esri)
    vehicleIcon.js      — DivIcon SVG avec flèche de cap rotative, couleur par statut
  playback/
    PlaybackMap.jsx     — Polyline ghost + polyline animée bleue + marker rotatif
    PlaybackControls.jsx— Scrubber, Play/Pause, Reset, vitesses 1×→30×

pages/
  LiveTracking.jsx    — Monte useDevices + useEcho, fetche les géofences, rend TrackingMap
  PlaybackPage.jsx    — Route full-screen /trips/:tripId/playback
  ReportsPage.jsx     — Sidebar type/dates, tableau de résultats, export PDF/Excel
  BillingPage.jsx     — Plans cards, toggle mensuel/annuel, boutons Wave + Orange Money
  AdminPage.jsx       — Stats plateforme, liste tenants, quota editor inline, pagination.
                        Section DevicePoolSection : devices non assignés + assignés par company.
```

### Décisions frontend importantes

**Zustand keyed par UUID** : le store indexe les devices par `device.uuid` (`{ [device.uuid]: device }`). Les sélecteurs de composants utilisent aussi `device.uuid`. Incohérence UUID/ID = marqueurs invisibles ou non-sélectionnables.

**Zustand — NE PAS utiliser de getters JS** : Zustand merge le state via `Object.assign({}, state, partial)`. `Object.assign` appelle les getters et copie leur valeur courante (pas la fonction). Après le premier `set()`, un getter devient une valeur figée et ne se recalcule plus jamais. Utiliser des fonctions sélecteur exportées + hooks avec `shallow` :
```js
export function selectFilteredDevices(s) { /* filtre pur */ }
export function useFilteredDevices() { return useDeviceStore(selectFilteredDevices, shallow) }
```

**Singleton Echo** : `getEcho()` dans `useEcho.js` crée l'instance une seule fois (closure module). Évite les connexions WebSocket multiples si le composant re-monte.

**preferCanvas sur Leaflet** : activé sur les deux maps (TrackingMap, PlaybackMap) pour de meilleures performances avec de nombreux marqueurs.

**RAF loop pour le playback** : `usePlayback` utilise `requestAnimationFrame` avec accumulation de temps (`accumRef`) pour avancer l'index proportionnellement aux deltas `device_time` GPS réels.

**Map First UX** : la carte occupe 100% de l'espace disponible. La sidebar se replie via un tab latéral (desktop) ou un drawer (mobile). Les overlays sont en `position: absolute` z-1000.

---

## Routes API complètes

```
# Publiques (auth par secret partagé X-Traccar-Secret)
POST /api/v1/gps/ingest           ← format Traccar (deviceId) ou legacy (uniqueId)
POST /api/v1/gps/ingest/batch
POST /api/v1/gps/ingest/events    ← reçoit les événements Traccar (event.forward.url), ignoré

# Callbacks signés par le provider (pas de Sanctum)
POST /api/v1/payments/wave/callback
POST /api/v1/payments/orange-money/callback

# Auth
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/logout          [sanctum]
GET  /api/v1/auth/me              [sanctum]

# Authentifiées [sanctum]
GET|POST|PUT|DELETE /api/v1/devices
GET   /api/v1/devices/{uuid}/positions
GET   /api/v1/devices/{uuid}/trips
PATCH /api/v1/devices/{uuid}/assign-company   ← super admin : assigne à une company (ou null = pool)
PATCH /api/v1/devices/{uuid}/assign-user      ← company admin : assigne à un user

GET /api/v1/geofence-events                   ← 200 derniers events pour la company

GET /api/v1/trips
GET /api/v1/trips/{id}
GET /api/v1/trips/{id}/positions  ← pour le playback

GET|POST|PUT|DELETE /api/v1/geofences         ← routes résolues par UUID (getRouteKeyName)
POST /api/v1/geofences/{uuid}/devices

GET  /api/v1/reports/mileage
GET  /api/v1/reports/stops
GET  /api/v1/reports/speeding
POST /api/v1/reports/export
GET  /api/v1/reports/export/{jobId}/status

GET  /api/v1/plans
POST /api/v1/payments/wave/initiate
POST /api/v1/payments/orange-money/initiate

GET /api/v1/company
PUT /api/v1/company

# Super-admin uniquement
GET   /api/v1/admin/stats
GET   /api/v1/admin/companies
GET   /api/v1/admin/companies/{id}
PATCH /api/v1/admin/companies/{id}/quota
PATCH /api/v1/admin/companies/{id}/toggle
```

---

## Variables d'environnement critiques

| Variable | Usage |
|----------|-------|
| `TRACCAR_WEBHOOK_SECRET` | Secret partagé validé dans `GpsIngestController` (header `X-Traccar-Secret`) |
| `WAVE_API_KEY` | Si vide → mode stub (pas d'appel réel) |
| `WAVE_WEBHOOK_SECRET` | Validation HMAC des callbacks Wave |
| `ORANGE_MONEY_CLIENT_ID/SECRET/MERCHANT_KEY` | OAuth2 + initiation OMWP |
| `VITE_PUSHER_*` | Config Laravel Echo côté frontend |

La valeur actuelle de `TRACCAR_WEBHOOK_SECRET` dans `.env` doit correspondre exactement à ce qui est configuré dans `docker/traccar/traccar.xml` (`forward.header`).

---

## Comptes de test

### Traccar
- URL : `http://localhost:8082`
- Compte : `admin@senflote.sn` / `admin`
- Device enregistré : `Mon Telephone` (uniqueId: `53120381`, Traccar internal id: `1`)
  - Configuré dans Traccar Client Android : URL `http://100.95.104.102:5055`, OsmAnd protocol
  - `traccar_id = 1` dans notre table `devices`

### Laravel
| Email | Role | Company |
|-------|------|---------|
| `super@senflote.sn` | super_admin | — (accès global) |
| `mamadou@transportdakar.sn` | company_admin | company 1 |
| `admin@testflotte.sn` | company_admin | company 2 |
| `dispatcher@testflotte.sn` | dispatcher | company 2 |
| `viewer@testflotte.sn` | viewer | company 2 |

Le device `Mon Telephone` est dans `company_id = 2` (TestFlotte).

---

## Pièges connus (gotchas)

### Zustand + getters JS
**Ne jamais** utiliser la syntaxe `get propName() { }` dans un store Zustand. `Object.assign` (utilisé en interne par Zustand) appelle et fige les getters après le premier `set()`. Le résultat : valeurs toujours vides, marqueurs invisibles sur la carte. Toujours exporter des fonctions sélecteur pures + hooks avec `shallow`.

### React Rules of Hooks + conditional returns
Tous les `useEffect`, `useState`, `useRef`, etc. doivent être appelés **avant** tout `return null` conditionnel. Si un composant retourne `null` conditionnellement avant un hook, React crashe silencieusement lors du changement de condition.

### UUID vs ID dans les sélecteurs
Le store Zustand indexe par `device.uuid`. Les sélections, comparaisons et keys React doivent utiliser `device.uuid`. Utiliser `device.id` (numérique) provoque des marqueurs non-sélectionnables et des re-renders erronés.

### Queue worker : `--queue=gps,default`
Le worker DOIT écouter la queue `gps`. Les jobs GPS sont dispatchés sur `onQueue('gps')`. Si le worker n'écoute que `default`, aucune position n'est traitée.

### Traccar forward.url vs event.forward.url
- `forward.url` → fires sur **chaque position GPS** reçue
- `event.forward.url` → fires uniquement sur les **événements Traccar** (geofence, overspeed, device online/offline)
Ne pas confondre les deux. Notre pipeline GPS nécessite `forward.url`.

### Vitesse Traccar API : nœuds → km/h
Le payload de `forward.url` retourne la vitesse en **nœuds**. `GpsIngestController` convertit automatiquement (`× 1.852`). Ne pas doubler la conversion dans `ProcessGpsPosition` ou `updateLiveState`.

### Route model binding par UUID
Les modèles `Device` et `Geofence` ont `getRouteKeyName()` retournant `'uuid'`. Toutes les routes utilisant `{device}` ou `{geofence}` reçoivent et résolvent des UUIDs, pas des IDs numériques.

---

## Ce qui reste à faire (non implémenté)

- **GeofenceController** — CRUD + attachDevices (stub route définie, controller absent)
- **CompanyController** — show/update (stub route définie, controller absent)
- **Middleware role:super_admin** — les routes `/admin` n'ont pas encore de gate explicite
- **Vues Blade pour PDF** — `resources/views/reports/mileage.blade.php` etc.
- **ReportExport Excel** — classe `App\Exports\ReportExport`
- **Packages à installer** — `barryvdh/laravel-dompdf`, `maatwebsite/excel`
- **Trip detection** — le job de découpage automatique des trajets n'est pas écrit
- **Reverse geocoding** — `start_address` / `end_address` sur trips
- **Soketi/Reverb** — le WebSocket server n'est pas dans le docker-compose
- **Tests** — aucun test écrit pour l'instant
- **Horizon** — le worker tourne en `queue:work` brut
- **Traccar device auto-création** — quand un device est créé dans Laravel, il faudrait aussi le créer dans Traccar via l'API Traccar et stocker le `traccar_id` retourné

---

## Commandes de démarrage

```bash
# 1. Copier et remplir les variables d'environnement
cp .env.example .env
cp frontend/.env.example frontend/.env

# 2. Démarrer les conteneurs
docker compose up -d --build

# 3. Initialiser Laravel (dans le conteneur app)
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed

# 4. Lancer le frontend (hors Docker)
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Le backend est accessible sur `http://localhost:8000`, Traccar sur `http://localhost:8082`.

### Tester le pipeline GPS manuellement

```bash
# Format Traccar (forward.url) — lookup par traccar_id
curl -X POST http://localhost:8000/api/v1/gps/ingest \
  -H "Content-Type: application/json" \
  -H "X-Traccar-Secret: traccar-shared-secret" \
  -d '{
    "deviceId": 1,
    "latitude": 14.7598,
    "longitude": -17.3791,
    "speed": 0,
    "course": 90,
    "deviceTime": "2026-05-13T10:00:00.000Z",
    "attributes": { "batteryLevel": 80, "ignition": false }
  }'

# Format legacy (lookup par traccar_unique_id)
curl -X POST http://localhost:8000/api/v1/gps/ingest \
  -H "Content-Type: application/json" \
  -H "X-Traccar-Secret: traccar-shared-secret" \
  -d '{
    "uniqueId": "53120381",
    "latitude": 14.7598,
    "longitude": -17.3791,
    "speed": 30,
    "angle": 90,
    "deviceTime": "2026-05-13T10:00:00.000Z",
    "attributes": {}
  }'
```

---

## Conventions de code adoptées

- **Pas de commentaires** sauf si le WHY est non-obvie (contrainte cachée, contournement de bug).
- **Pas de gestion d'erreur défensive** pour des cas impossibles — on fait confiance aux garanties du framework.
- **Zustand sans Context** — le store est importé directement dans chaque composant via le hook sélecteur. Jamais de getters JS dans le store.
- **Réponses API** : `{ data: [...] }` pour les collections, `{ data: {...} }` pour les ressources uniques, `{ message, ... }` pour les actions.
- **UUIDs** exposés vers l'extérieur, IDs numériques en interne. Les modèles auto-génèrent l'UUID au `creating`. `getRouteKeyName()` retourne `'uuid'` sur Device et Geofence.
- **Soft deletes** sur `companies`, `users`, `devices`, `geofences`.
- **Tailwind dark-first** — pas de mode clair prévu (l'app est pensée pour usage terrain / mobile WebView).
