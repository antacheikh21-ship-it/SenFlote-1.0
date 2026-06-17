# SenFlote — Documentation

> Plateforme SaaS de tracking GPS pour flottes de véhicules — Marché africain

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Fonctionnalités](#2-fonctionnalités)
3. [Architecture technique](#3-architecture-technique)
4. [Installation et démarrage](#4-installation-et-démarrage)
5. [Structure du projet](#5-structure-du-projet)
6. [API — Référence rapide](#6-api--référence-rapide)
7. [Intégration GPS (Traccar)](#7-intégration-gps-traccar)
8. [Paiement mobile](#8-paiement-mobile)
9. [Abonnements et quotas](#9-abonnements-et-quotas)
10. [Déploiement production](#10-déploiement-production)
11. [Ce qui reste à faire](#11-ce-qui-reste-à-faire)

---

## 1. Vue d'ensemble

SenFlote est une application web SaaS permettant aux entreprises de suivre leur flotte de véhicules en temps réel. Elle est conçue pour le marché africain : interface adaptée aux conditions réseau, paiement via Wave et Orange Money, et support des trackers GPS courants sur le continent.

**Cas d'usage typiques**
- Suivi en temps réel d'une flotte de livraison ou de transport
- Surveillance des comportements de conduite (survitesse, sorties de zone)
- Génération de rapports kilométriques pour la comptabilité
- Rejeu d'un trajet pour résoudre un litige ou former des chauffeurs

**Modèle économique**
Abonnement mensuel ou annuel par entreprise (−15% annuel), basé sur le nombre de véhicules. Trois plans : Basic, Pro, Enterprise.

---

## 2. Fonctionnalités

### Live Tracking
- Carte interactive avec position en temps réel de tous les véhicules
- Mise à jour sans rechargement de page (WebSocket)
- Marqueurs de véhicules avec direction de déplacement et code couleur par statut
- Basculement carte routière / satellite
- Popup véhicule : vitesse, état moteur, dernière activité, signal GSM, batterie

### Sidebar véhicules
- Liste filtrée par statut : En route · Au ralenti · Arrêté · Hors ligne
- Recherche par nom ou plaque d'immatriculation
- Indicateurs GSM et batterie pour chaque véhicule
- Sélection d'un véhicule → la carte se centre dessus automatiquement

### Géofencing
- Création de zones géographiques (polygones ou cercles)
- Alertes configurables : entrée, sortie, ou les deux
- Détection côté serveur via PostGIS (aucun calcul côté client)
- Historique des événements d'entrée/sortie par zone et par véhicule

### Rejeu de trajet (Playback)
- Sélection d'un trajet dans l'historique
- Animation du déplacement sur la carte avec polyline progressive
- Contrôles : lecture, pause, retour au début
- Vitesses de lecture : 1× · 2× · 5× · 10× · 30×
- Scrubber cliquable pour naviguer à n'importe quel point du trajet

### Rapports
- **Kilométrage** : km total, nombre de trajets, vitesse moyenne/max, heures par véhicule
- **Arrêts** : durée des stationnements entre chaque trajet, localisation
- **Survitesse** : liste des dépassements de seuil avec horodatage et localisation
- Export en **PDF** et **Excel** (traitement asynchrone, téléchargement par lien)

### Espace Facturation
- Comparaison des plans avec prix en XOF
- Paiement en un clic via Wave ou Orange Money
- Confirmation et activation automatique de l'abonnement

### Administration (Super Admin)
- Vue globale de toutes les entreprises clientes
- Métriques plateforme : nombre d'entreprises, véhicules, utilisateurs, revenu mensuel
- Modification des quotas par entreprise sans changer leur plan
- Activation / désactivation d'un compte client

---

## 3. Architecture technique

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                        Navigateur                           │
│              React 18 + Tailwind + Leaflet                  │
│         WebSocket (Laravel Echo) ←──────────────┐          │
└──────────────────────┬──────────────────────────┼──────────┘
                       │ HTTP/REST                │ WebSocket
┌──────────────────────▼──────────────────────────┼──────────┐
│                    Nginx (port 8000)             │          │
└──────────────────────┬───────────────────────────┘          │
                       │                                       │
┌──────────────────────▼──────────────────────────────────────┤
│              Laravel 11 — PHP 8.3                           │
│   API REST · Queue Worker · Scheduler · Broadcaster        │
└───────┬──────────────┬──────────────┬───────────────────────┘
        │              │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌───▼──────┐
   │PostgreSQL│   │   Redis   │  │ Traccar  │
   │+ PostGIS │   │Queue+Cache│  │GPS Server│
   └──────────┘   └───────────┘  └──────────┘
```

### Technologies utilisées

| Composant | Technologie |
|-----------|-------------|
| Backend API | Laravel 11, PHP 8.3 |
| Base de données | PostgreSQL 16 + PostGIS 3.4 |
| Cache & Files d'attente | Redis 7 |
| Serveur GPS | Traccar (open source) |
| Temps réel | Laravel Echo + Pusher-compatible |
| Frontend | React 18, Vite, Tailwind CSS 3 |
| Cartographie | Leaflet 1.9, react-leaflet |
| État global | Zustand |
| Conteneurs | Docker Compose |

### Flux GPS — De l'appareil à la carte

```
1. Le tracker GPS envoie sa position à Traccar
   (protocoles : GT06, Teltonika, OsmAnd, TK103…)

2. Traccar transmet chaque position à Laravel
   POST /api/v1/gps/ingest  (sécurisé par secret partagé)

3. Laravel valide et met en file d'attente (Redis)

4. Le Worker traite la position :
   ├── Enregistre en base de données (PostGIS)
   ├── Met à jour l'état live du véhicule
   ├── Vérifie les géofences (ST_Contains PostGIS)
   └── Envoie la nouvelle position par WebSocket

5. Le navigateur reçoit la position et déplace le marqueur
   sans rechargement de page
```

---

## 4. Installation et démarrage

### Prérequis

- Docker Desktop (Windows/Mac) ou Docker + Docker Compose (Linux)
- Node.js 20+ (pour le frontend uniquement)
- Git

### Étapes

**1. Cloner et configurer les variables d'environnement**

```bash
git clone <url-du-repo> senflote
cd senflote

# Backend
cp .env.example .env
# Remplir les valeurs dans .env (voir section Variables d'environnement)

# Frontend
cp frontend/.env.example frontend/.env
```

**2. Démarrer les conteneurs**

```bash
docker compose up -d --build
```

Cette commande lance : Laravel, Nginx, PostgreSQL+PostGIS, Redis, Traccar, le Worker de queue, et le Scheduler.

**3. Initialiser la base de données**

```bash
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
```

Le seeder crée les 3 plans d'abonnement (Basic, Pro, Enterprise).

**4. Démarrer le frontend**

```bash
cd frontend
npm install
npm run dev
```

### URLs d'accès

| Service | URL |
|---------|-----|
| Application web | http://localhost:3000 |
| API Laravel | http://localhost:8000/api/v1 |
| Interface Traccar | http://localhost:8082 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### Variables d'environnement importantes

Toutes les variables sont dans `.env` à la racine :

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `APP_KEY` | Clé de chiffrement Laravel (`php artisan key:generate`) | Oui |
| `DB_PASSWORD` | Mot de passe PostgreSQL | Oui |
| `TRACCAR_WEBHOOK_SECRET` | Secret partagé entre Traccar et Laravel | Oui |
| `WAVE_API_KEY` | Clé API Wave (laisser vide = mode test) | Non |
| `WAVE_WEBHOOK_SECRET` | Secret pour valider les callbacks Wave | Non |
| `ORANGE_MONEY_CLIENT_ID` | Identifiant client Orange Money | Non |
| `ORANGE_MONEY_CLIENT_SECRET` | Secret client Orange Money | Non |
| `ORANGE_MONEY_MERCHANT_KEY` | Clé marchande Orange Money | Non |

> Les services de paiement fonctionnent en **mode stub** si les clés sont absentes — utile pour le développement.

---

## 5. Structure du projet

```
senflote/
├── docker-compose.yml          Orchestration de tous les services
├── .env.example                Variables d'environnement à copier
├── CLAUDE.md                   Documentation technique interne
├── DOCUMENTATION.md            Ce fichier
│
├── docker/
│   ├── php/Dockerfile          Image PHP 8.3 avec extensions PostGIS
│   ├── nginx/default.conf      Configuration Nginx
│   ├── postgres/init.sql       Activation des extensions PostGIS
│   └── traccar/traccar.xml     Configuration Traccar (webhook + protocoles GPS)
│
├── backend/                    Application Laravel 11
│   ├── app/
│   │   ├── Models/             Company, User, Device, Position, Geofence,
│   │   │                       GeofenceEvent, Trip, Plan, Subscription
│   │   ├── Http/Controllers/Api/V1/
│   │   │   ├── GpsIngestController.php    Réception des positions GPS
│   │   │   ├── TripController.php         Trajets + données de playback
│   │   │   ├── ReportController.php       Rapports et exports
│   │   │   ├── PaymentController.php      Wave et Orange Money
│   │   │   └── AdminController.php        Gestion des tenants
│   │   ├── Jobs/
│   │   │   ├── ProcessGpsPosition.php     Traitement asynchrone des positions
│   │   │   └── ExportReport.php           Génération PDF/Excel en arrière-plan
│   │   ├── Services/
│   │   │   ├── GeofenceService.php        Détection entrées/sorties PostGIS
│   │   │   ├── Payment/WavePaymentService.php
│   │   │   └── Payment/OrangeMoneyService.php
│   │   └── Events/
│   │       ├── VehiclePositionUpdated.php  Broadcast WebSocket position
│   │       └── GeofenceTriggered.php       Broadcast WebSocket alerte zone
│   ├── database/
│   │   ├── migrations/         8 migrations dans l'ordre
│   │   └── seeders/            PlanSeeder (Basic, Pro, Enterprise)
│   ├── routes/api.php          Toutes les routes API
│   └── config/services.php     Config Traccar, Wave, Orange Money
│
└── frontend/                   Application React 18
    ├── src/
    │   ├── api/                Couche HTTP (axios, devices, trips, reports, admin)
    │   ├── stores/             État global Zustand
    │   ├── hooks/              useDevices, useEcho, usePlayback
    │   ├── components/
    │   │   ├── layout/         AppLayout (nav + sidebar + outlet)
    │   │   ├── sidebar/        SearchBar, StatusFilter, VehicleCard, VehicleList
    │   │   ├── map/            TrackingMap, VehicleMarker, VehiclePopup, LayerControl
    │   │   ├── playback/       PlaybackMap, PlaybackControls
    │   │   └── ui/             StatusBadge, SignalBars, BatteryBar
    │   └── pages/
    │       ├── LiveTracking.jsx
    │       ├── PlaybackPage.jsx
    │       ├── ReportsPage.jsx
    │       ├── BillingPage.jsx
    │       └── AdminPage.jsx
    ├── tailwind.config.js
    └── vite.config.js
```

---

## 6. API — Référence rapide

L'API suit les conventions REST. Toutes les réponses sont en JSON.

**Authentification** : Bearer Token (Laravel Sanctum)
```
Authorization: Bearer <token>
```

### Endpoints principaux

#### Authentification
```
POST /api/v1/auth/login          Se connecter → retourne le token
POST /api/v1/auth/register       Créer un compte entreprise
POST /api/v1/auth/logout         Révoquer le token
GET  /api/v1/auth/me             Profil utilisateur connecté
```

#### Véhicules
```
GET    /api/v1/devices               Liste des véhicules de l'entreprise
GET    /api/v1/devices/{id}          Détail d'un véhicule
POST   /api/v1/devices               Ajouter un véhicule
PUT    /api/v1/devices/{id}          Modifier un véhicule
DELETE /api/v1/devices/{id}          Supprimer un véhicule
GET    /api/v1/devices/{id}/trips    Trajets d'un véhicule
```

#### Trajets et Playback
```
GET /api/v1/trips                         Liste des trajets (filtrable par date, véhicule)
GET /api/v1/trips/{id}                    Résumé d'un trajet
GET /api/v1/trips/{id}/positions          Points GPS pour le playback (max 500)
```

#### Géofences
```
GET    /api/v1/geofences                  Liste des zones
POST   /api/v1/geofences                  Créer une zone
PUT    /api/v1/geofences/{id}             Modifier une zone
DELETE /api/v1/geofences/{id}             Supprimer une zone
POST   /api/v1/geofences/{id}/devices     Associer des véhicules à une zone
```

#### Rapports
```
GET  /api/v1/reports/mileage              Kilométrage par véhicule
GET  /api/v1/reports/stops                Temps d'arrêt
GET  /api/v1/reports/speeding             Événements de survitesse
POST /api/v1/reports/export               Lancer un export PDF ou Excel
GET  /api/v1/reports/export/{jobId}/status  Vérifier l'état de l'export
```

**Paramètres communs pour les rapports :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `date_from` | date | Début de période (YYYY-MM-DD) |
| `date_to` | date | Fin de période (YYYY-MM-DD) |
| `device_ids[]` | array | Filtrer par véhicule(s) |
| `speed_threshold` | integer | Seuil survitesse en km/h (défaut : 100) |
| `min_dwell_minutes` | integer | Durée minimum d'un arrêt en minutes (défaut : 5) |

#### Abonnement et paiement
```
GET  /api/v1/plans                           Liste des plans disponibles
POST /api/v1/payments/wave/initiate          Démarrer un paiement Wave
POST /api/v1/payments/orange-money/initiate  Démarrer un paiement Orange Money
```

---

## 7. Intégration GPS (Traccar)

Traccar est le serveur GPS open source qui reçoit les données brutes des trackers matériels et les transmet à SenFlote.

### Protocoles GPS supportés

Traccar supporte plus de 200 protocoles. Les plus utilisés en Afrique de l'Ouest sont préconfigurés :

| Protocole | Port TCP | Trackers compatibles |
|-----------|----------|----------------------|
| GT06 | 5001 | Concox, Jointech, Sinotrack |
| Teltonika | 5027 | FMB series, FMC series |
| OsmAnd | 5055 | Application mobile OsmAnd |
| TK103 | 5002 | TK103A/B, Coban |

### Ajouter un véhicule dans Traccar

1. Ouvrir l'interface Traccar : `http://localhost:8082`
2. Créer un appareil avec l'IMEI du tracker
3. Renseigner le même IMEI dans SenFlote (champ `traccar_unique_id` lors de la création du device)
4. La liaison se fait automatiquement lors de la réception de la première position

### Configuration du webhook

Le fichier `docker/traccar/traccar.xml` configure le forwarding automatique :

```xml
<entry key='event.forward.enable'>true</entry>
<entry key='event.forward.url'>http://nginx/api/v1/gps/ingest</entry>
<entry key='event.forward.header'>X-Traccar-Secret: traccar-shared-secret</entry>
```

La valeur `traccar-shared-secret` doit correspondre à `TRACCAR_WEBHOOK_SECRET` dans `.env`.

---

## 8. Paiement mobile

SenFlote prend en charge deux opérateurs de paiement mobile répandus en Afrique de l'Ouest.

### Wave

1. Créer un compte marchand sur [wave.com](https://wave.com)
2. Renseigner `WAVE_API_KEY` et `WAVE_WEBHOOK_SECRET` dans `.env`
3. Configurer l'URL de callback dans le dashboard Wave :
   ```
   https://votre-domaine.com/api/v1/payments/wave/callback
   ```

### Orange Money

1. Créer un compte développeur sur le portail Orange Developer
2. Renseigner `ORANGE_MONEY_CLIENT_ID`, `ORANGE_MONEY_CLIENT_SECRET`, `ORANGE_MONEY_MERCHANT_KEY`
3. Configurer l'URL de notification :
   ```
   https://votre-domaine.com/api/v1/payments/orange-money/callback
   ```

> **Mode test :** Si les clés ne sont pas renseignées, les services retournent des réponses fictives sans appel réseau. Pratique pour développer et tester les flows sans compte marchand.

### Cycle de vie d'un paiement

```
Client choisit un plan
  → Frontend appelle POST /payments/wave/initiate
  → Backend crée une Subscription en statut "past_due"
  → Backend retourne l'URL de paiement Wave
  → Redirection du client vers Wave
  → Client paye sur Wave
  → Wave appelle POST /payments/wave/callback (signé HMAC)
  → Backend vérifie la signature
  → Subscription passe en statut "active"
  → Client peut utiliser la plateforme
```

---

## 9. Abonnements et quotas

### Plans disponibles

| Plan | Véhicules | Géofences | Historique | Rapports | Playback | API | Prix/mois |
|------|-----------|-----------|------------|----------|----------|-----|-----------|
| Basic | 5 | 5 | 30 jours | — | — | — | 15 000 XOF |
| Pro | 25 | 50 | 90 jours | ✓ | ✓ | — | 45 000 XOF |
| Enterprise | Illimité | Illimité | 365 jours | ✓ | ✓ | ✓ | 120 000 XOF |

Abonnement annuel : **−15%** sur tous les plans.

### Surcharge de quota (Admin)

Un administrateur SenFlote peut modifier les quotas d'une entreprise spécifique sans changer son plan. Par exemple : accorder 30 véhicules à un client Basic pendant une période promotionnelle. Les surcharges sont stockées dans `companies.settings` et prennent le dessus sur les limites du plan.

---

## 10. Déploiement production

### Checklist avant mise en production

- [ ] Remplacer `APP_DEBUG=false` et `APP_ENV=production` dans `.env`
- [ ] Générer une `APP_KEY` forte : `php artisan key:generate`
- [ ] Changer tous les mots de passe par défaut (`DB_PASSWORD`, `TRACCAR_WEBHOOK_SECRET`)
- [ ] Configurer un certificat SSL (Let's Encrypt recommandé) et mettre `APP_URL` en `https://`
- [ ] Ajouter un serveur WebSocket (Soketi ou Laravel Reverb) dans le `docker-compose.yml`
- [ ] Configurer le stockage S3 ou compatible pour les exports PDF/Excel (`FILESYSTEM_DISK=s3`)
- [ ] Installer les packages d'export : `composer require barryvdh/laravel-dompdf maatwebsite/excel`
- [ ] Remplacer `queue:work` par Laravel Horizon pour le monitoring des files
- [ ] Mettre en place les sauvegardes automatiques PostgreSQL

### Serveur WebSocket recommandé

Ajouter dans `docker-compose.yml` :

```yaml
soketi:
  image: quay.io/soketi/soketi:latest
  container_name: senflote_soketi
  ports:
    - "6001:6001"
  environment:
    SOKETI_APP_ID: senflote
    SOKETI_APP_KEY: senflote_key
    SOKETI_APP_SECRET: senflote_secret
  networks:
    - senflote_net
```

Puis mettre à jour `.env` :
```
BROADCAST_CONNECTION=pusher
PUSHER_HOST=soketi
PUSHER_PORT=6001
```

---

## 11. Ce qui reste à faire

Ces fonctionnalités sont architecturées et prévues mais pas encore implémentées. Les routes API sont définies — seuls les controllers correspondants manquent.

| Fonctionnalité | Effort estimé | Priorité |
|----------------|--------------|----------|
| Controller authentification (login/register) | 2–3h | Critique |
| Controller CRUD véhicules | 2h | Critique |
| Controller CRUD géofences | 2h | Critique |
| Middleware de rôle super_admin | 1h | Haute |
| Vues Blade PDF pour les rapports | 3–4h | Haute |
| Classe Excel pour les exports | 2h | Haute |
| Serveur WebSocket (Soketi/Reverb) | 1h | Haute |
| Job de détection automatique de trajets | 4–6h | Moyenne |
| Reverse geocoding des adresses | 2h | Moyenne |
| Laravel Horizon (monitoring queues) | 1h | Moyenne |
| Tests automatisés | Variable | Basse |

---

## Contact et support

Pour toute question technique sur cette base de code, se référer au fichier `CLAUDE.md` qui documente les décisions d'architecture internes et les conventions de code adoptées.
