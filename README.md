# Zengest — Système de gestion de restaurant

Architecture microservices NestJS pour la gestion des commandes, du menu et de l'authentification d'un restaurant.

---

## Architecture

```
Client HTTP (navigateur)
        │
        ▼
┌─────────────────────┐
│     API Gateway     │  ← NestJS HTTP · port 3000
│                     │    JwtAuthGuard · RolesGuard
└──────────┬──────────┘
           │ NATS (message broker)
   ┌───────┼───────────────┐
   ▼       ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│order-service│  │auth-service│  │menu-service│
│  NestJS    │  │  NestJS    │  │  NestJS    │
│Microservice│  │Microservice│  │Microservice│
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │               │               │
  orders-db        users-db        menu-db
  (MongoDB)        (MongoDB)       (MongoDB)
```

Chaque service possède sa propre base de données — isolation totale des domaines.
Aucun service ne lit directement la base d'un autre — tout passe par NATS.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | NestJS 11 + TypeScript |
| Message broker | NATS |
| Base de données | MongoDB 7 + Mongoose |
| Frontend | React + TypeScript + MUI + Zustand |
| Authentification | JWT + bcrypt |
| Tests | Jest + ts-jest |
| Infrastructure | Docker + Docker Compose |

---

## Structure du projet

```
Backend/
├── gateway/                  ← API Gateway HTTP (port 3000)
│   ├── src/
│   │   ├── orders/           ← Routes commandes
│   │   ├── auth/             ← Routes authentification
│   │   ├── menu/             ← Routes menu
│   │   └── common/           ← Guards, décorateurs
│   ├── Dockerfile
│   └── .env
│
├── order-service/            ← Microservice commandes
│   ├── src/
│   │   └── orders/
│   │       ├── orders.controller.ts
│   │       ├── orders.service.ts
│   │       ├── schemas/
│   │       └── dto/
│   ├── Dockerfile
│   └── .env
│
├── auth-service/             ← Microservice authentification
│   ├── src/
│   │   ├── auth/
│   │   └── users/
│   ├── Dockerfile
│   └── .env
│
├── menu-service/             ← Microservice menu
│   ├── src/
│   │   └── menu/
│   ├── Dockerfile
│   └── .env
│
├── docker-compose.yml
└── .env                      ← Variables d'environnement Docker
```

---

## Démarrage rapide

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js 20+ (pour le développement local)

### Avec Docker Compose (recommandé)

```bash
# Cloner le projet
git clone <repo>
cd Backend

# Créer le fichier .env racine
cp .env.example .env
# Editer .env avec vos secrets JWT

# Démarrer tous les services
docker-compose up --build

# Ou en arrière-plan
docker-compose up -d
```

L'API est disponible sur `http://localhost:3000`.
Le monitoring NATS est disponible sur `http://localhost:8222`.

### En développement local (sans Docker)

```bash
# Terminal 1 — Infrastructure
docker-compose up nats mongodb

# Terminal 2 — order-service
cd order-service && npm install && npm run start:dev

# Terminal 3 — auth-service
cd auth-service && npm install && npm run start:dev

# Terminal 4 — menu-service
cd menu-service && npm install && npm run start:dev

# Terminal 5 — gateway
cd gateway && npm install && npm run start:dev
```

---

## Variables d'environnement

### `.env` racine (Docker Compose)

```env
# Infrastructure
NATS_URL=nats://nats:4222

# Gateway
PORT=3000

# JWT
JWT_SECRET=change_this_secret_in_production_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change_this_refresh_secret_in_production_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d

# MongoDB
MONGODB_URI_ORDERS=mongodb://mongodb:27017/orders-db
MONGODB_URI_AUTH=mongodb://mongodb:27017/auth-db
MONGODB_URI_MENU=mongodb://mongodb:27017/menu-db
```

### `.env` locaux (développement sans Docker)

```env
# gateway/.env
NATS_URL=nats://localhost:4222
PORT=3000
JWT_SECRET=change_this_secret_in_production_min_32_chars

# order-service/.env
NATS_URL=nats://localhost:4222
MONGODB_URI=mongodb://localhost:27017/orders-db

# auth-service/.env
NATS_URL=nats://localhost:4222
MONGODB_URI=mongodb://localhost:27017/auth-db
JWT_SECRET=change_this_secret_in_production_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change_this_refresh_secret_in_production_min_32_chars
JWT_REFRESH_EXPIRES_IN=7d

# menu-service/.env
NATS_URL=nats://localhost:4222
MONGODB_URI=mongodb://localhost:27017/menu-db
```

---

## Routes API

### Authentification

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/auth/register` | Public | Inscription |
| `POST` | `/auth/login` | Public | Connexion |
| `POST` | `/auth/refresh` | Public | Renouveler le token |
| `POST` | `/auth/logout` | JWT | Déconnexion |

### Commandes

| Méthode | Route | Rôles | Description |
|---------|-------|-------|-------------|
| `POST` | `/orders` | Tous | Créer une commande |
| `GET` | `/orders` | Staff+ | Lister les commandes |
| `GET` | `/orders/:orderNumber` | Tous | Détail d'une commande |
| `GET` | `/orders/customer/:customerId` | Tous | Commandes d'un client |
| `PATCH` | `/orders/:orderNumber` | Staff+ | Modifier les items |
| `PATCH` | `/orders/:orderNumber/status` | Staff+ | Changer le statut |

### Menu

| Méthode | Route | Rôles | Description |
|---------|-------|-------|-------------|
| `GET` | `/menu` | Public | Lister les plats |
| `GET` | `/menu/available` | Public | Plats disponibles |
| `GET` | `/menu/category/:mainCategory` | Public | Par catégorie |
| `POST` | `/menu` | Manager+ | Créer un plat |
| `PATCH` | `/menu/:id` | Manager+ | Modifier un plat |
| `PATCH` | `/menu/:id/available` | Manager+ | Marquer disponible |
| `PATCH` | `/menu/:id/unavailable` | Manager+ | Marquer indisponible |
| `DELETE` | `/menu/:id` | Manager+ | Supprimer un plat |

---

## Rôles

| Rôle | Périmètre |
|------|-----------|
| `Client` | Ses propres commandes, consultation menu |
| `Staff_salle` | Commandes en salle |
| `Staff_bar` | Commandes boissons |
| `Kitchen` | Consultation et suivi des commandes |
| `Manager` | Accès complet commandes + menu |
| `Owner` | Accès complet |
| `Admin` | Accès système total |

---

## Statuts de commande

```
PENDING → CONFIRM → PROCESSING → READY → DELIVERED
                                        → PAID
```

`PAID` et `DELIVERED` sont des statuts **indépendants** — le paiement peut
intervenir avant ou après la livraison selon le contexte.

| Statut | Description |
|--------|-------------|
| `PENDING` | En attente de confirmation |
| `CONFIRM` | Confirmée par le staff |
| `PROCESSING` | En préparation en cuisine |
| `READY` | Prête à être servie |
| `DELIVERED` | Livrée au client |
| `PAID` | Payée |
| `CANCELLED` | Annulée |
| `DELETED` | Supprimée (soft delete) |

---

## Tests

```bash
# Depuis order-service/
npm test                 # Lancer tous les tests
npm run test:watch       # Mode watch
npm run test:cov         # Rapport de couverture
```

Couverture actuelle :

```
orders.service.ts    | 100% lignes | 100% fonctions
orders.controller.ts | 100% lignes | 100% fonctions
Total                | 36 tests    | 0 échec
```

---

## Commandes Docker utiles

```bash
# Démarrer
docker-compose up

# Démarrer en arrière-plan
docker-compose up -d

# Rebuild et démarrer
docker-compose up --build

# Rebuild un seul service
docker-compose up --build gateway

# Arrêter
docker-compose down

# Arrêter et supprimer les volumes (⚠️ efface MongoDB)
docker-compose down -v

# Logs d'un service
docker-compose logs gateway --tail=50

# Statut des containers
docker-compose ps
```

---

## Exemple d'utilisation

```bash
# 1 — S'inscrire
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Duc-Son",
    "lastName": "Nguyen",
    "email": "staff@zengest.fr",
    "password": "Password123!",
    "role": "Staff_salle"
  }'

# 2 — Se connecter et récupérer le token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "staff@zengest.fr", "password": "Password123!" }'

# 3 — Créer une commande
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "ressourceId": "table-3",
    "items": [
      { "productId": "p1", "productName": "Burger", "quantity": 2, "unitPrice": 12.50 }
    ],
    "pricing": { "subtotal": 25.00, "total": 25.00 }
  }'

# 4 — Changer le statut
curl -X PATCH http://localhost:3000/orders/ORD-20260401-0001/status \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "CONFIRM" }'
```
