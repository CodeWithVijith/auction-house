# Auction House API

This is the first production backend slice. It provides PostgreSQL-backed organizations, users, memberships, sessions, and auction events.

## Local setup

1. Create a PostgreSQL database.
2. Copy `.env.example` values into your local environment. Do not commit real secrets.
3. Run `npm run api:migrate` once for a new database.
4. Set the bootstrap variables and run `npm run api:bootstrap` once.
5. Run `npm run api:dev`.

The API listens on `127.0.0.1:3000` by default.

After `npm run build`, the API also serves the compiled React application and its direct-route fallback. See `DEPLOYMENT.md` for the complete local test and Render deployment procedure.

## Implemented endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/events`
- `POST /api/events`

Sessions use an HTTP-only, SameSite Strict cookie. Mutating authenticated requests require the `x-csrf-token` value returned by login or `/api/auth/me`. Event reads are scoped to the authenticated organization. Event creation is limited to administrators and organizers.
