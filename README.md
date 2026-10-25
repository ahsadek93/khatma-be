# Khatma API

NestJS API for the Khatma mobile app. The API uses MongoDB through Mongoose.
Supabase is the reference for the app's current features and business rules;
the new backend starts with fresh users and Khatmas, with no Supabase data
import.

## Run locally

Install dependencies and start MongoDB, then run:

```bash
npm run start:dev
```

The app loads `.env` from the project root when it exists. See `.env.example`
for the supported variables. `PORT` defaults to `3000`, and `MONGODB_URI`
defaults to `mongodb://127.0.0.1:27017/khatma`. Auth requires the SMTP settings,
`JWT_SECRET`, and `OTP_PEPPER` at startup. Node.js 20.12 or newer is required
for the built-in `.env` loader.

`GET /health` returns `{ "status": "ok" }`.

## Source layout

```text
src/
  main.ts                 # Application bootstrap
  app.module.ts           # Root composition and MongoDB connection
  config/                 # Environment-backed configuration
  auth/                   # Authentication and authorization
  users/                  # User profiles
  khatmas/                # Shared Khatma lifecycle and membership
  quran/                  # Quran Juz progress
  zikr/                   # Zikr settings and member progress
  realtime/               # Live updates for clients
  health/                 # Health endpoint
```

Feature folders are Nest modules. Auth uses SMTP settings plus `JWT_SECRET`
and `OTP_PEPPER`; set both to distinct random values of at least 32 bytes and
keep them only in `.env` or the deployment environment. The auth endpoints are
`POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/refresh`, and
`POST /auth/sign-out`; `GET /users/me` requires a bearer access token. Keep each
feature's controller, service, DTOs, schemas, and feature-specific tests
together in that folder as they are implemented. Controllers handle HTTP
input and responses; services own business rules and coordinate persistence.
Keep schemas near the feature that owns their data. Khatmas, Quran, Zikr, and
Realtime are currently scaffolds.

Generate each auth secret locally with this command, run twice, and put the
two different outputs in `JWT_SECRET` and `OTP_PEPPER`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

`AppModule` composes feature modules and configures the shared MongoDB
connection. A feature module should export a provider only when another module
needs to call it. Avoid a generic repository layer until there is a concrete
need for multiple persistence implementations.

## Feature behavior to implement

- **Auth and users:** establish app identity, protect private routes, and
  manage user profiles.
- **Khatmas:** create and join groups, manage membership and invite codes, and
  track active or completed status.
- **Quran:** manage the 30 Juz claim, release, and completion lifecycle.
- **Zikr:** manage phrase and goal settings, member claims, aggregate progress,
  and completion.
- **Realtime:** publish progress, membership, and completion changes to app
  subscribers.

Enforce authorization, validation, and progress invariants in the backend.
The mobile app is a client and must not be trusted to enforce those rules.

## Commands

```bash
npm run start:dev  # Development server with watch mode
npm run build      # Production build
npm run lint       # Lint source and tests
npm run test       # Unit tests
npm run test:e2e   # End-to-end tests
```
