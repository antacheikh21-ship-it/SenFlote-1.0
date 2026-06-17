# SenFlote 1.0

> **Statut : FERMÉ — prototype précoce / alpha**
> Développé : ~1 jour (12–13 mai 2026)
> Stack : Laravel 11 + React 18 + Traccar + PostGIS + Soketi (non déployé)

---

## Résumé

SenFlote est une plateforme SaaS de **gestion de flotte GPS** pour le marché africain (Sénégal). Elle permet le suivi en temps réel des véhicules, le géofencing PostGIS, l'historique des trajets, et les paiements mobile-money (Wave, Orange Money) — le tout dans une architecture multi-tenant.

Cette version 1.0 a été la **première tentative** de construction de la plateforme, développée en une journée puis abandonnée pour des problèmes architecturaux fondamentaux.

---

## Architecture

### Stack technique

| Couche | Technologie |
|---|---|
| Backend | Laravel 11 (PHP 8.3 FPM Alpine) |
| Base de données | PostgreSQL 16 + PostGIS 3.4 |
| Cache & files d'attente | Redis 7.2 |
| Serveur GPS | Traccar 6.x (non forké) |
| WebSocket | Laravel Echo + Soketi (prévu, jamais déployé) |
| Frontend | React 18 + Vite 5 |
| CSS | Tailwind CSS 3 |
| Cartographie | Leaflet 1.9 + react-leaflet 4.2 |
| État | Zustand 4.5 |
| Conteneurs | Docker Compose 3.8 (7 conteneurs) |

### Topologie Docker

```
senflote_app       → PHP 8.3-FPM (Laravel)
senflote_nginx     → Nginx 1.25 (port 8000)
senflote_postgres  → PostGIS 16-3.4 (port 5432)
senflote_redis     → Redis 7.2 (port 6379)
senflote_traccar   → Traccar 6.x GPS (8082 + ports protocoles 5001-5150)
senflote_worker    → queue worker (même image que app)
senflote_scheduler → schedule:run (même image que app)
```

### Flux de données GPS

```
Tracker GPS (GT06/Teltonika/OsmAnd/TK103)
  → Traccar (ports 5001/5027/5055/5002)
  → forward.url POST /api/v1/gps/ingest (header X-Traccar-Secret)
  → GpsIngestController → ProcessGpsPosition (queue gps)
  → Position::create() + Device::updateLiveState()
  → GeofenceService::checkDevice() (ST_Contains / ST_DWithin)
  → broadcast(VehiclePositionUpdated) → WebSocket
```

**Deux URLs forward dans Traccar :**
- `forward.url` → traite CHAQUE position (pipeline principal)
- `event.forward.url` → **ignoré** (retourne 200 — les événements Traccar ne sont pas traités)

### Multi-tenant

- **Company** = tenant, isolé par `company_id`
- Rôles : `super_admin`, `company_admin`, `dispatcher`, `viewer`
- Device lifecycle : Pool (sans company) → Assigné à une company → Assigné à un utilisateur
- Plans : Basic (5 véhicules, 15k XOF), Pro (25 véhicules, 45k XOF), Enterprise (illimité, 120k XOF)

---

## Fonctionnalités

### Implémentées
- Pipeline d'ingestion GPS complet (Tracker → Traccar → Laravel → PostGIS → WS)
- Live tracking carte Leaflet (marqueurs temps réel, statuts, direction)
- Sidebar véhicules (recherche, filtre statut, compteurs)
- Géofencing CRUD complet (cercle/polygone) + détection spatiale PostGIS
- Replay de trajets animé (1x–30x)
- Rapports : kilométrage, arrêts, excès de vitesse
- Export PDF/Excel asynchrone (stubs — paquets manquants)
- Facturation : affichage plans, initiation Wave + Orange Money
- Callbacks de paiement (Wave HMAC, Orange Money)
- Panneau Super Admin (companies, quotas, pool de devices)
- Dashboard avec cartes de statut
- Migration DB (12 migrations, index PostGIS)

### Non implémentées / Gaps
- **Serveur WebSocket** — Soketi absent du docker-compose ; le frontend Echo ne peut pas se connecter
- **Événements Traccar ignorés** — `event.forward.url` retourne 200 ignoré
- **Rendu PDF/Excel** — Paquets `barryvdh/laravel-dompdf` et `maatwebsite/excel` non installés
- **Détection automatique de trajets** — Aucune segmentation position→trajet
- **Géocodage inversé** — `start_address` / `end_address` jamais peuplés
- **Sync Traccar** — Créer un device dans Laravel ne le crée pas dans Traccar
- **Tests** — Zéro test (back-end ni frontend)
- **Rétention des positions** — Aucune stratégie de partitionnement/archivage

---

## Leçons retenues (documentées dans le Vault)

Ces bugs ont été identifiés durant le développement de la v1.0 et ont directement influencé la v4.0 :

1. **Zustand Getter Bug** — La syntaxe `get propName() {}` dans les stores Zustand gèle après le premier `set()` car `Object.assign` copie la valeur évaluée du getter, pas la fonction. Solution : utiliser des fonctions selecteurs.

2. **Queue Worker Named Queue** — Les jobs GPS étaient dispatchés sur la queue `gps` mais le worker écoutait seulement `default`. Les positions n'étaient jamais traitées. Solution : `php artisan queue:work --queue=gps,default`.

3. **Vitesse en nœuds** — Traccar renvoie la vitesse en nœuds, pas en km/h. Affichage à ~54% de la valeur réelle. Solution : multiplier par 1.852.

---

## État d'avancement

**Alpha — noyau fonctionnel, gaps significatifs pour la production.**

Ce qui fonctionne solidement :
- Le pipeline GPS est câblé de bout en bout
- Le géofencing PostGIS fonctionne (cercles et polygones)
- L'authentification multi-tenant est complète
- L'interface React existe avec toutes les pages de navigation
- Les intégrations de paiement sont codées (stub ou réelles)

Ce qui manque pour la production :
- Infrastructure WebSocket (Soketi)
- Traitement des événements Traccar (excès vitesse, alarmes, online/offline)
- Rendu des exports
- Détection auto des trajets
- Partitionnement des positions
- Tests
- Monitoring (Horizon)
- Sync bidirectionnelle avec Traccar

**Estimation : ~2-3 semaines pour un MVP production-ready.**

---

## Contexte historique

La v1.0 a duré ~1 jour avant d'être abandonnée pour la v2.0 (architecture WS Daemon), puis la v3.0 (fork Java Traccar), et enfin la v4.0 (architecture actuelle — Traccar non forké, toute la logique dans Laravel). Les leçons de la v1.0 sur le fait de **NE PAS forker Traccar** et d'utiliser un **token unique** ont été déterminantes pour l'architecture de la v4.0.

*Documentation générée à partir du code source et du Vault Obsidian (00 - Home.md, 06 - Lessons Learned/Bug Patterns.md, 04 - Decisions/ADR-006.md).*
