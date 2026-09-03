# API Gateway

The API Gateway is the browser-facing boundary of the Centralized Monitoring
System. It validates access tokens, applies role-based authorization, proxies
requests to internal services, and aggregates cross-service dashboard data.

See the [root README](../../README.md) for the full architecture and stack setup.

## Responsibilities

- Expose the public API under `/api` on port `3005`.
- Validate JWT access tokens and forward trusted user identity headers.
- Enforce `ADMIN` and `OPERATOR` route permissions.
- Restrict credentialed CORS requests to `FRONTEND_URL`.
- Proxy feature APIs to their owning services.
- Aggregate dashboard summaries, system status, and asset lifecycle impact.
- Export Gateway HTTP metrics at `GET /api/metrics`.

## Route Ownership

| Gateway route | Destination |
| --- | --- |
| `/api/auth`, `/api/users` | Auth service |
| `/api/assets` | Asset service |
| `/api/monitoring-targets`, `/api/health-check-targets`, `/api/metric-rules` | Monitoring service |
| `/api/alerts` | Alerting service |
| `/api/notification-recipients` | Notification service |
| `/api/audit-logs`, `/api/reports` | Security and report service |
| `/api/dashboard/summary` | Gateway aggregation |
| `/api/system/status` | Gateway aggregation |
| `/api/asset-lifecycle-impact/:assetId` | Gateway aggregation |

Login, token refresh, logout, invitation validation, invitation acceptance, and
Gateway metrics are public routes. All other routes require an authenticated
role. Configuration and administration routes require `ADMIN`; operators retain
read access and can manage the alert lifecycle.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3005` |
| `FRONTEND_URL` | Allowed dashboard origin; defaults to `http://localhost:3010` |
| `JWT_ACCESS_SECRET` | Access-token verification secret; must match Auth service |
| `ASSET_SERVICE_URL` | Asset service base URL |
| `MONITORING_SERVICE_URL` | Monitoring service base URL |
| `ALERTING_SERVICE_URL` | Alerting service base URL |
| `NOTIFICATION_SERVICE_URL` | Notification service base URL |
| `AUTH_SERVICE_URL` | Auth service base URL |
| `SECURITY_REPORT_SERVICE_URL` | Security and report service base URL |

## Development

```bash
npm ci
npm run start:dev
```

```bash
npm test -- --runInBand
npm run test:e2e
npm run build
```

This service owns no database and has no migration step. Browser clients should
use the Gateway rather than calling internal services directly.
