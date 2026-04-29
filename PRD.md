# Product Requirements Document — Event Booking System

## 1. Overview

A role-gated REST API for an event booking platform. Two user roles: **Organizers** who create and manage events, and **Customers** who browse events and book tickets. Notification side-effects are handled asynchronously via a BullMQ job queue.

---

## 2. Goals

- Clean MVC architecture with role-based access control.
- Atomic ticket availability enforcement to prevent overbooking under concurrency.
- Async background jobs for notifications so HTTP responses are never blocked.

---

## 3. User Roles

**Organizer** — creates events, manages them, monitors bookings.  
**Customer** — browses events, books tickets, views their bookings.

---

## 4. Functional Requirements

### 4.1 Authentication

| # | Requirement |
| --- | --- |
| F-01 | Register with name, email, password, and role (`organizer` or `customer`). |
| F-02 | Login with email + password; receive a short-lived access token and a refresh token (stored in httpOnly cookies). |
| F-03 | Refresh tokens rotate on every use. |
| F-04 | Logout invalidates the refresh token server-side. |

### 4.2 Events — Organizer

| # | Requirement |
| --- | --- |
| F-05 | Create an event: title, description, date, venue, total tickets, price per ticket. |
| F-06 | Update any field of an event they own. |
| F-07 | Cancel an event — all bookings are soft-deleted, customers are notified via background job. |
| F-08 | View all events they created. |
| F-09 | View all bookings across their events. |

### 4.3 Events — Customer & Public

| # | Requirement |
| --- | --- |
| F-10 | Browse all upcoming (non-cancelled) events. |
| F-11 | View a single event's details including remaining availability. |

### 4.4 Bookings — Customer

| # | Requirement |
| --- | --- |
| F-12 | Book one or more tickets — availability is decremented atomically to prevent overbooking. |
| F-13 | Confirmation email is queued as a background job on successful booking. |
| F-14 | View own booking history. |
| F-15 | Cancel a booking — availability is restored. |

### 4.5 Background Jobs (BullMQ)

| # | Task | Trigger |
| --- | --- | --- |
| BG-01 | Booking confirmation | Customer books tickets |
| BG-02 | Event cancellation notice | Organizer cancels event |

Both jobs use 3 retries with exponential backoff. Console output stands in for real email delivery — the infrastructure is real and swappable.

---

## 5. Non-Functional Requirements

| # | Requirement |
| --- | --- |
| NF-01 | Passwords hashed with bcrypt. |
| NF-02 | Organizers cannot access or modify events they do not own (enforced by middleware). |
| NF-03 | Ticket decrement uses `$inc` in a single atomic MongoDB operation. |
| NF-04 | All responses follow a consistent shape: `{ statusCode, success, message, data }`. |
| NF-05 | Errors centralised in a custom `APIError` class; all async handlers wrapped in `asyncHandler`. |
| NF-06 | Structured logging with Winston (console + file transports). |

---

## 6. Data Models

### User
```
name              String
email             String (unique)
password          String (bcrypt hashed)
role              organizer | customer
refreshToken      String (nullable)
```

### Event
```
title             String (unique)
description       String
date              Date
venue             String
totalTickets      Number  (min: 50)
availableTickets  Number
pricePerTicket    Number
organizer         ObjectId → User
status            upcoming | cancelled
```

### Booking
```
event             ObjectId → Event
customer          ObjectId → User
ticketsBooked     Number
totalAmount       Number
status            booked | cancelled
bookedAt          Date
```

---

## 7. API Endpoints

### Auth — `/api/v1/auth`

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | `/register` | Public | Register |
| POST | `/login` | Public | Login, receive tokens |
| POST | `/logout` | JWT | Logout |
| POST | `/refresh-token` | JWT | Rotate tokens |

### Events — `/api/v1/events`

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/` | JWT | All upcoming events |
| GET | `/:eventId` | JWT | Single event detail |
| POST | `/` | Organizer | Create event |
| PATCH | `/:eventId` | Organizer (owner) | Update event |
| DELETE | `/:eventId` | Organizer (owner) | Cancel event → BG-02 |
| GET | `/my-events` | Organizer | Own events |
| GET | `/my-bookings` | Organizer | All bookings across own events |

### Bookings — `/api/v1/bookings`

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | `/:eventId` | Customer | Book tickets → BG-01 |
| GET | `/` | Customer | Own bookings |
| DELETE | `/:bookingId` | Customer (owner) | Cancel booking |

---

## 8. Permission Matrix

| Action | Organizer | Customer |
| --- | --- | --- |
| Browse / view events | Yes | Yes |
| Create event | Yes | No |
| Update / cancel own event | Yes | No |
| View bookings for own events | Yes | No |
| Book tickets | No | Yes |
| View own bookings | No | Yes |
| Cancel own booking | No | Yes |

---

## 9. Out of Scope

- Forgot / reset password
- Event filtering by date or venue
- Payment processing
- Swagger / OpenAPI docs
- Frontend
