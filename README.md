# Event Registration & Management System — Backend

A FastAPI backend for an event registration and management platform. Attendees can discover and register for events; admins can manage the full event lifecycle, view attendees, and track registrations. Built for **Nowshera Events Co.** to replace WhatsApp + spreadsheet based registration tracking.

## Tech stack

- **FastAPI** — REST API framework
- **Supabase (Postgres)** — database
- **JWT (python-jose)** — authentication
- **Passlib (bcrypt)** — password hashing
- **n8n** — automated emails (registration confirmation, cancellation, event cancellation)

## Features

- Email/password authentication with role-based access (Admin / Attendee)
- Admin can create, edit, publish, complete, and cancel events
- Attendees can browse published events and register/cancel their own registrations
- Backend-enforced business rules:
  - one active registration per attendee per event (no duplicates)
  - registration blocked once an event is full, unpublished, cancelled, or in the past
  - event capacity cannot be reduced below the number of active registrations
- Admin dashboard with live totals (events, registrations, capacity, availability)
- Automated emails via n8n webhook on registration, cancellation, and event cancellation

## Project structure

```
.
├── main.py            # FastAPI app and all routes
├── auth.py             # password hashing, JWT creation/verification, auth dependencies
├── database.py          # Supabase client setup
├── models.py            # Pydantic request/response schemas
├── notifications.py      # sends events to the n8n webhook
├── schema.sql            # Supabase table definitions
└── requirements.txt
```

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd event-management-system
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

### 2. Create the database tables

Open Supabase → SQL Editor → run the contents of `schema.sql`.

### 3. Environment variables

Copy `.env.example` to `.env` and fill in real values:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key      # service_role, not the anon/publishable key
JWT_SECRET=a_generated_random_secret
ADMIN_SIGNUP_CODE=a_temporary_code       # used once to create the first admin account
N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/xxxx
```

Generate a JWT secret with:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Run locally

```bash
uvicorn main:app --reload
```

API docs (Swagger UI): `http://127.0.0.1:8000/docs`

## Authentication

- `POST /auth/register` — creates an account. Include `admin_code` matching `ADMIN_SIGNUP_CODE` to create an admin account; omit it for a normal attendee account.
- `POST /auth/login` — returns a JWT access token.
- Send the token on protected routes as: `Authorization: Bearer <token>`

## API overview

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create an account |
| POST | `/auth/login` | Public | Log in, get a token |
| GET | `/auth/me` | Authenticated | Current user info |
| GET | `/events` | Public | Published, upcoming events |
| GET | `/events/{id}` | Public | Single event details |
| POST | `/events/{id}/register` | Attendee | Register for an event |
| GET | `/me/registrations` | Attendee | My registrations |
| DELETE | `/registrations/{id}` | Attendee (owner) | Cancel a registration |
| POST | `/admin/events` | Admin | Create an event |
| PUT | `/admin/events/{id}` | Admin | Edit an event |
| PATCH | `/admin/events/{id}/status` | Admin | Change event status |
| GET | `/admin/events` | Admin | List all events |
| GET | `/admin/events/{id}/attendees` | Admin | Attendees for an event |
| GET | `/admin/dashboard` | Admin | Totals and reporting |

## Deployment

Deployed on [Render](https://render.com):

- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables set in the Render dashboard (same as `.env`)

Live URL: `https://your-app-name.onrender.com`

## Automation (n8n)

On successful registration, cancellation, or event cancellation, the backend sends a JSON payload to the `N8N_WEBHOOK_URL`, with an `event_type` field (`registration_created`, `registration_cancelled`, or `event_cancelled`). n8n routes each type to the corresponding email workflow. A separate scheduled n8n workflow sends reminder emails the day before each event.

## Test credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | (set during testing) |
| Attendee | attendee@example.com | (set during testing) |

## Known limitations

- No online payments, seat maps, or QR check-in (out of scope per project brief)
- Email delivery depends on the n8n instance being active
- Free-tier hosting (Render) may have a cold-start delay on the first request after inactivity
