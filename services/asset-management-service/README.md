# Asset Management Service

The Asset Management service owns the system inventory and asset lifecycle. An
asset is the stable identity referenced by monitoring targets, health checks,
metric rules, alerts, audit records, and reports.

See the [root README](../../README.md) for the full architecture and stack setup.

## Domain

Supported asset types:

- `SERVER` for host-level monitoring through Node Exporter.
- `APPLICATION` for application endpoints and health checks.
- `SERVICE` for inventory records that are not directly monitored in V1.

Supported environments are `PRODUCTION`, `STAGING`, and `DEVELOPMENT`.

Lifecycle states:

- `ACTIVATE`: operational and available for configured monitoring.
- `INACTIVATE`: temporarily paused while retaining configuration and history.
- `DEACTIVATE`: permanently retired and no longer editable.

Deactivation publishes an alert event so related active alerts can resolve while
their lifecycle history remains available.

## HTTP API

The service listens on port `3000`. Direct service routes do not use the
Gateway's `/api` prefix.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/assets` | Register an asset |
| `GET` | `/assets` | List assets |
| `GET` | `/assets/:id` | Get one asset |
| `PATCH` | `/assets/:id` | Update asset metadata |
| `PATCH` | `/assets/:id/status` | Switch between active and inactive |
| `PATCH` | `/assets/:id/deactivate` | Permanently deactivate an asset |
| `GET` | `/health` | Service health probe |

All browser traffic should use the corresponding `/api/assets` routes through
the API Gateway.

## Persistence and Events

- PostgreSQL stores asset identity, environment, endpoint, address, and status.
- RabbitMQ receives audit events for asset changes.
- Asset deactivation publishes to the alert-event queue.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3000` |
| `DATABASE_URL` | Asset PostgreSQL connection string |
| `RABBITMQ_URL` | RabbitMQ connection string |
| `RABBITMQ_AUDIT_QUEUE` | Audit event queue |
| `RABBITMQ_ALERT_QUEUE` | Alert event queue; defaults to `alert_events` |

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

Run `npm run db:generate` only after an intentional schema change. Review the
generated SQL before applying it.
