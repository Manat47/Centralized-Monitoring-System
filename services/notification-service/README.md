# Notification Service

The Notification service consumes notification events and delivers operational
email through Gmail SMTP. It also owns the configured delivery destinations
used for alert notifications.

See the [root README](../../README.md) for the full architecture and stack setup.

## Responsibilities

- Consume alert and user-invitation notification events from RabbitMQ.
- Render readable HTML and plain-text email content.
- Deliver messages through authenticated SMTP.
- Store email, LINE, Slack, and webhook delivery destinations.
- Accept both system-user addresses and external addresses.
- Send a test notification to a selected destination.
- Publish audit events when recipient settings change.

Recipients are delivery destinations only. An address does not need a system
account, and adding it does not grant application access.

## HTTP API

The service listens on port `3003`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/notification-settings` | Read delivery destinations and routing mode |
| `PUT` | `/notification-settings` | Replace all settings (existing bulk client) |
| `POST` | `/notification-settings/recipients` | Create one destination |
| `PATCH` | `/notification-settings/recipients/:recipientId` | Update one destination, including its enabled state |
| `DELETE` | `/notification-settings/recipients/:recipientId` | Remove one destination |
| `PATCH` | `/notification-settings/routing` | Set broadcast or fallback mode |
| `POST` | `/notification-settings/:recipientId/test` | Test one destination |
| `GET` | `/notification-recipients` | List configured recipients |
| `PUT` | `/notification-recipients` | Replace the recipient list |
| `POST` | `/notification-recipients/test` | Send a test notification |
| `GET` | `/health` | Service health probe |

The `/notification-recipients` routes are the older email-only API. The
settings UI uses the individual `/api/notification-settings` routes through the
API Gateway. The bulk `PUT` route remains available for existing clients. The
individual mutation routes return the full updated settings view. Fallback
priority levels are compacted after individual changes so enabled destinations
retain consecutive levels.

## Persistence and Events

- PostgreSQL stores recipient configuration.
- RabbitMQ supplies notification events.
- RabbitMQ receives audit events for recipient changes and test sends.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3003` |
| `DATABASE_URL` | Notification PostgreSQL connection string |
| `RABBITMQ_URL` | RabbitMQ connection string |
| `RABBITMQ_NOTIFICATION_QUEUE` | Incoming notification queue; defaults to `notification_events` |
| `RABBITMQ_AUDIT_QUEUE` | Audit event queue; defaults to `audit_events` |
| `SMTP_USER` | Gmail account used as the sender |
| `SMTP_PASS` | Gmail app password or SMTP credential |
| `DASHBOARD_PUBLIC_URL` | Public Dashboard origin for alert links in email, LINE, Slack, and webhook presentation data (for example `https://monitor.example`) |

Webhook deliveries retain the existing alert fields and include a `presentation`
object with a readable headline, source name, severity, summary, and Dashboard
URL when configured. `X-Signature-SHA256` signs the exact JSON body including
this object.

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

Use a dedicated SMTP credential for development. Do not commit it or use a
personal account password.
