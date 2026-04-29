# Event Booking System — Backend API

A role-gated REST API for an event booking platform. Organizers create and manage events; customers browse and book tickets. Notification side-effects are handled asynchronously via a BullMQ job queue so HTTP responses are never blocked.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Bun |
| Framework | Express 4 |
| Language | TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT — access token + rotating refresh token |
| Queue | BullMQ + Redis |
| Logging | Winston |

---

## Prerequisites

- [Bun](https://bun.sh) >= 1.3
- MongoDB instance (local or Atlas)
- Redis instance

---

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `PORT` | Server port (default `3000`) |
| `MONGO_URI` | MongoDB connection string |
| `CORS_ORIGIN` | Allowed origin(s), comma-separated for multiple |
| `ACCESS_TOKEN_SECRET` | JWT signing secret for access tokens |
| `ACCESS_TOKEN_EXPIRY` | e.g. `15m` |
| `REFRESH_TOKEN_SECRET` | JWT signing secret for refresh tokens |
| `REFRESH_TOKEN_EXPIRY` | e.g. `7d` |
| `REDIS_PORT` | Redis port (default `6379`) |
| `NODE_ENV` | `development` or `production` |

### 3. Run

```bash
bun run dev     # hot reload
bun run start   # production
```

Server starts at `http://localhost:3000`.

---

## Project Structure

```
src/
├── controllers/
│   ├── auth.controller.ts       # register, login, logout, refresh token
│   ├── organizer.controller.ts  # event CRUD + booking overview
│   └── user.controller.ts       # book tickets, cancel, view bookings
├── db/
│   └── index.ts                 # mongoose connection
├── jobs/
│   └── emailQueue.ts            # BullMQ queue + worker (3 retries, exponential backoff)
├── middleware/
│   ├── auth.middleware.ts       # verifyJWT, checkOrganizer, checkUser
│   └── validator.middleware.ts  # express-validator error formatter
├── models/
│   ├── user.model.ts
│   ├── event.model.ts
│   └── booking.model.ts
├── routes/
│   ├── index.ts                 # mounts all routers under /api/v1
│   ├── auth.routes.ts
│   ├── organizer.route.ts
│   └── user.routes.ts
├── types/
│   └── types.ts
├── utils/
│   ├── APIError.ts
│   ├── APIResponse.ts
│   ├── asyncHandler.ts
│   ├── constants.ts
│   └── logger.ts
└── app.ts
index.ts                         # entry point, graceful shutdown
```

---

## API Reference

All routes are prefixed with `/api/v1`.

### Auth — `/auth`

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register as `organizer` or `customer` |
| POST | `/auth/login` | Public | Login — sets access + refresh token cookies |
| POST | `/auth/logout` | JWT | Logout — clears cookies, invalidates refresh token |
| POST | `/auth/refresh-token` | JWT | Rotate access + refresh tokens |

### Events — `/event`

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/event/all-events` | Organizer | List own events |
| GET | `/event/bookings` | Organizer | All bookings across own events |
| POST | `/event/create-event` | Organizer | Create an event |
| PATCH | `/event/:eventId` | Organizer (owner) | Update event fields |
| DELETE | `/event/:eventId` | Organizer (owner) | Cancel event — soft-deletes all bookings |

### Tickets — `/tickets`

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | `/tickets/:eventId` | Customer | Book tickets — atomic availability check |
| PATCH | `/tickets/:eventId` | Customer | Cancel some or all tickets — restores availability |
| GET | `/tickets/all-tickets` | Customer | View own booking history |

---

## Response Shape

Every response follows a consistent envelope:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "...",
  "data": {}
}
```

Errors use the same shape with `success: false` and an optional `errors` field containing field-level validation messages.

---

## Key Design Decisions

**Atomic ticket decrement**
`bookTickets` uses a single `findOneAndUpdate` with a conditional filter (`availableTickets: { $gte: requested }`) and `$inc`. Two concurrent requests both reading the same count and both succeeding is impossible — MongoDB handles the race at the operation level, no application locking needed.

**Rotating refresh tokens**
On every `/refresh-token` call, both the access token and refresh token are replaced. The old refresh token is overwritten in the database, so replayed tokens are rejected.

**BullMQ for notifications**
Email jobs are enqueued after the HTTP response is sent. The worker processes them with 3 retries and exponential backoff — a plain `setTimeout` would silently drop jobs on crash.

**Soft-delete on event cancellation**
Cancelling an event marks its bookings as `cancelled` rather than deleting them, preserving history. The event itself stays in the database with `status: 'cancelled'`.

---

## Logging

Winston writes to three destinations:

| Transport | Content |
| --- | --- |
| Console | All levels (colorised in development) |
| `logs/error.log` | Errors only |
| `logs/all.log` | All levels |

Log level is `debug` in development, `warn` in production.
