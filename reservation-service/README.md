# Reservation Service

Microservice de gestion des réservations de l'application **Zengest**.  
Il fait partie de l'architecture microservices NestJS + NATS + MongoDB.

---

## Rôle du service

Le `reservation-service` gère le cycle de vie complet des réservations :
- Création avec vérification de disponibilité (anti-doublon)
- Consultation par client ou par identifiant
- Modification des détails (date, nombre de couverts, notes)
- Changement de statut avec contrôle des permissions par rôle

Il ne communique **jamais directement avec le client HTTP** — toutes les requêtes passent par la **Gateway** via NATS.

---

## Stack technique

| Technologie | Usage |
|---|---|
| NestJS | Framework microservice |
| NATS | Message broker (transport) |
| MongoDB | Base de données |
| Mongoose | ODM |
| class-validator | Validation des DTOs |
| Jest | Tests unitaires |

---

## Architecture

```
Client HTTP
    │
    ▼
┌─────────────────┐
│   API Gateway   │  HTTP · port 3000
│  /reservations  │
└────────┬────────┘
         │ NATS (Request/Reply)
         ▼
┌──────────────────────┐
│  reservation-service │  Microservice NATS (pas de port HTTP)
│                      │
│  @MessagePattern :   │
│  reservations.create         │
│  reservations.findAll        │
│  reservations.findByCustomer │
│  reservations.findById       │
│  reservations.update         │
│  reservations.updateStatus   │
└──────────┬───────────┘
           │
     reservations-db
       (MongoDB)
```

---

## Structure du projet

```
reservation-service/
├── src/
│   ├── reservations/
│   │   ├── dto/
│   │   │   ├── create-reservation.dto.ts   ← validation à la création
│   │   │   └── update-reservation.dto.ts   ← validation à la mise à jour
│   │   ├── schemas/
│   │   │   └── reservation.schema.ts       ← modèle Mongoose
│   │   ├── reservations.controller.ts      ← @MessagePattern NATS
│   │   ├── reservations.service.ts         ← logique métier + MongoDB
│   │   ├── reservations.module.ts          ← module NestJS
│   │   ├── reservations.controller.spec.ts ← tests unitaires controller
│   │   └── reservations.service.spec.ts    ← tests unitaires service
│   ├── app.module.ts                       ← ConfigModule + MongooseModule
│   └── main.ts                             ← NestFactory.createMicroservice()
├── .env
└── Dockerfile
```

---

## Modèle de données

```typescript
Reservation {
  _id        : ObjectId   // généré par MongoDB
  customerId : string     // ID du client (injecté depuis le JWT par la Gateway)
  ressourceId: string     // ID de la table/ressource (générique — pas tableId)
  date       : Date       // date et heure de la réservation
  numberOfGuests: number  // nombre de couverts (min 1)
  status     : string     // statut courant (voir ci-dessous)
  notes      : string?    // remarques optionnelles
  createdBy  : string     // userId du créateur (injecté depuis le JWT)
  updatedBy  : string?    // userId du dernier modificateur
  createdAt  : Date       // auto (timestamps: true)
  updatedAt  : Date       // auto (timestamps: true)
}
```

### Statuts possibles

| Statut | Description |
|---|---|
| `PENDING` | Réservation créée, en attente de confirmation |
| `CONFIRMED` | Réservation confirmée par le staff |
| `CANCELLED` | Réservation annulée |
| `COMPLETED` | Réservation honorée |
| `NO_SHOW` | Client ne s'est pas présenté |

---

## Patterns NATS

### `reservations.create`
Crée une réservation après vérification de disponibilité.

**Payload :**
```json
{
  "customerId": "string",
  "ressourceId": "string",
  "date": "2026-06-15T19:30:00.000Z",
  "numberOfGuests": 4,
  "notes": "Anniversaire",
  "createdBy": "string"
}
```

**Réponse :** document `Reservation` créé

**Erreurs :**
- `409 Conflict` — créneau déjà réservé pour cette ressource

---

### `reservations.findAll`
Retourne toutes les réservations (staff uniquement côté Gateway).

**Payload :**
```json
{ "limit": 20, "skip": 0 }
```

**Réponse :**
```json
{
  "reservations": [...],
  "total": 42,
  "limit": 20,
  "skip": 0
}
```

---

### `reservations.findByCustomer`
Retourne les réservations d'un client.

**Payload :**
```json
{ "customerId": "string" }
```

**Réponse :** tableau de `Reservation`

---

### `reservations.findById`
Retourne une réservation par son `_id` MongoDB.

**Payload :**
```json
{ "id": "string" }
```

**Erreurs :**
- `404 Not Found` — réservation introuvable

---

### `reservations.update`
Modifie les détails d'une réservation.

**Payload :**
```json
{
  "id": "string",
  "date": "2026-06-20T20:00:00.000Z",
  "numberOfGuests": 6,
  "notes": "Table pour 6",
  "updatedBy": "string",
  "requesterId": "string",
  "requesterRole": "string"
}
```

**Règle métier :**
- Un `Client` ne peut modifier que ses propres réservations → `403 Forbidden` sinon

---

### `reservations.updateStatus`
Change le statut d'une réservation.

**Payload :**
```json
{
  "id": "string",
  "status": "CONFIRMED",
  "updatedBy": "string",
  "requesterId": "string",
  "requesterRole": "string"
}
```

**Règles métier :**
- Un `Client` ne peut qu'annuler (`CANCELLED`) → `403 Forbidden` pour tout autre statut
- Un `Client` ne peut annuler que ses propres réservations → `403 Forbidden` sinon

---

## Variables d'environnement

| Variable | Description | Valeur par défaut |
|---|---|---|
| `NATS_URL` | URL du broker NATS | `nats://localhost:4222` |
| `MONGODB_URI` | URI de connexion MongoDB | `mongodb://localhost:27017/reservations-db` |

---

## Lancer le service

### En local (développement)

```bash
# Installer les dépendances
npm install

# Démarrer en mode watch
npm run start:dev
```

> NATS et MongoDB doivent être disponibles aux URLs définies dans `.env`

### Via Docker Compose

```bash
# Depuis le dossier Backend/
docker-compose up --build reservation-service
```

---

## Tests

```bash
# Lancer tous les tests unitaires
npm run test

# Avec couverture de code
npm run test:cov
```

### Couverture

| Fichier | Tests |
|---|---|
| `reservations.controller.spec.ts` | 15 tests |
| `reservations.service.spec.ts` | 20 tests |

---

## Contrôle des accès (côté Gateway)

| Route | Méthode | Rôles autorisés |
|---|---|---|
| `/reservations` | POST | Client, Staff_salle, Manager, Owner, Admin |
| `/reservations` | GET | Staff_salle, Manager, Owner, Admin |
| `/reservations/my` | GET | Client, Staff_salle, Manager, Owner, Admin |
| `/reservations/customer/:id` | GET | Client, Staff_salle, Manager, Owner, Admin |
| `/reservations/:id` | GET | Client, Staff_salle, Manager, Owner, Admin |
| `/reservations/:id` | PATCH | Client, Staff_salle, Manager, Owner, Admin |
| `/reservations/:id/status` | PATCH | Client, Staff_salle, Manager, Owner, Admin |

> Note : les clients sont limités à leurs propres réservations par le service (vérification `customerId === requesterId`).

---

## Décisions d'architecture notables

**`ressourceId` plutôt que `tableId`** — le champ est intentionnellement générique pour permettre la réutilisation du service dans d'autres contextes (salles de réunion, créneaux, etc.).

**`PAID` et `DELIVERED` absents** — ces statuts appartiennent au domaine des commandes (`order-service`), pas des réservations.

**`requesterId` et `requesterRole` dans le payload NATS** — injectés par la Gateway depuis le JWT, ils permettent au service de vérifier les permissions sans avoir accès au token directement.