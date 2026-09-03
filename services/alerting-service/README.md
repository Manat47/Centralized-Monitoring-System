# Alerting Service

The Alerting service owns alert records, lifecycle events, deduplication state,
and transitions caused by metric rules, health checks, and asset lifecycle
changes.

See the [root README](../../README.md) for the full architecture and stack setup.

## Responsibilities

- Consume alert and asset-lifecycle events from RabbitMQ.
- Accept alert events through the internal HTTP ingestion endpoint.
- Create or update alerts without duplicating an already-open condition.
- Track `TRIGGERED`, `ACKNOWLEDGED`, `RESOLVED`, and `CLOSED` states.
- Automatically resolve alerts when a metric or health check recovers.
- Resolve related alerts when an asset is deactivated.
- Publish email-notification and audit events.
- Preserve lifecycle history for the alert detail view and reports.

Alert sources are `METRIC_RULE` and `HEALTH_CHECK`. Severities are `WARNING` and
`CRITICAL`.

## HTTP API

The service listens on port `3002`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/alerts` | Filter and list alerts |
| `GET` | `/alerts/:id` | Get alert details and lifecycle history |
| `PATCH` | `/alerts/:id/acknowledge` | Acknowledge a triggered alert |
| `PATCH` | `/alerts/:id/close` | Close a resolved alert |
| `GET` | `/alerts/report-summary` | Aggregate alert data for reports |
| `GET` | `/alerts/asset/:assetId/lifecycle-impact` | Count alerts affected by an asset transition |
| `POST` | `/internal/alert-events` | Internal alert-event ingestion |
| `GET` | `/health` | Service health probe |

Browser clients access `/api/alerts` through the API Gateway.

## Persistence and Events

- PostgreSQL stores alerts, lifecycle events, and health-check alert state.
- RabbitMQ supplies incoming alert events.
- Notification events are sent to the Notification service.
- Audit events are consumed by the Security and report service.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3002` |
| `DATABASE_URL` | Alerting PostgreSQL connection string |
| `RABBITMQ_URL` | RabbitMQ connection string |
| `RABBITMQ_ALERT_QUEUE` | Incoming alert event queue |
| `RABBITMQ_NOTIFICATION_QUEUE` | Outgoing notification event queue |
| `RABBITMQ_AUDIT_QUEUE` | Outgoing audit event queue |

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

Changes to lifecycle transitions should include tests for duplicate events,
recovery, acknowledgement, closure, and asset deactivation.
