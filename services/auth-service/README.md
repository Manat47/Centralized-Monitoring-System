# Auth Service

The Auth service owns users, credentials, refresh sessions, invitations, and
role assignment for the Centralized Monitoring System.

See the [root README](../../README.md) for the full architecture and stack setup.

## Authentication Flow

1. A pre-provisioned administrator creates a user with an email, display name,
   and role. No password is chosen by the administrator.
2. The service creates a time-limited invitation and publishes an email event.
3. The invited user opens the dashboard link and sets a password.
4. Login returns a short-lived access token and sets a rotating refresh token in
   an HTTP-only cookie.
5. Logout revokes the refresh session and clears the cookie.

Roles are `ADMIN` and `OPERATOR`. User administration is restricted to
administrators. User states include invited, active, and inactive account flows.

## HTTP API

The service listens on port `3004`.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/auth/login` | Authenticate with email and password |
| `POST` | `/auth/refresh` | Rotate the refresh session and issue an access token |
| `POST` | `/auth/logout` | Revoke the current refresh session |
| `GET` | `/auth/me` | Return the authenticated user |
| `POST` | `/auth/invitations/validate` | Validate an invitation token |
| `POST` | `/auth/invitations/accept` | Set the invited user's password |
| `POST` | `/users` | Create a user invitation |
| `GET` | `/users`, `/users/:userId` | List or inspect users |
| `PATCH` | `/users/:userId` | Update display name or role |
| `PATCH` | `/users/:userId/status` | Activate or deactivate a user |
| `POST` | `/users/:userId/invitations/resend` | Replace and resend a pending invitation |
| `DELETE` | `/users/:userId/invitations` | Revoke a pending invitation |
| `GET` | `/health`, `/health/ready` | Liveness and database readiness probes |

The dashboard accesses these endpoints under `/api` through the API Gateway.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3004` |
| `DATABASE_URL` | Auth PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Access-token signing secret; must match API Gateway |
| `JWT_ACCESS_EXPIRES_IN` | Access-token lifetime; defaults to `15m` |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | Refresh-session lifetime; defaults to `7` |
| `USER_INVITATION_EXPIRES_IN_HOURS` | Invitation lifetime; defaults to `48` |
| `FRONTEND_URL` | Base URL used in invitation links; defaults to `http://localhost:3010` |
| `RABBITMQ_URL` | RabbitMQ connection string |
| `RABBITMQ_NOTIFICATION_QUEUE` | Invitation email queue; defaults to `notification_events` |
| `RABBITMQ_AUDIT_QUEUE` | Audit event queue |

In production, `NODE_ENV=production` marks the refresh cookie as secure. Serve
the dashboard and Gateway over HTTPS before enabling that mode.

## Development

```bash
npm ci
npm run db:migrate
npm run start:dev
```

```bash
npm test -- --runInBand
npm run test:e2e
npm run build
```

The repository does not currently seed a default administrator. A fresh
environment requires an explicitly provisioned initial admin account.
