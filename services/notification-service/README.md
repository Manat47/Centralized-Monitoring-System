# Notification Service

The Notification service consumes notification events and delivers operational
email through Gmail SMTP. It also owns the configured recipient list used for
alert notifications.

See the [root README](../../README.md) for the full architecture and stack setup.

## Responsibilities

- Consume alert and user-invitation notification events from RabbitMQ.
- Render readable HTML and plain-text email content.
- Deliver messages through authenticated SMTP.
- Store a deduplicated list of notification recipient email addresses.
- Accept both system-user addresses and external addresses.
- Send a test message to the currently configured recipients.
- Publish audit events when recipient settings change.

Recipients are delivery destinations only. An address does not need a system
account, and adding it does not grant application access.

## HTTP API

The service listens on port `3003`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/notification-recipients` | List configured recipients |
| `PUT` | `/notification-recipients` | Replace the recipient list |
| `POST` | `/notification-recipients/test` | Send a test notification |
| `GET` | `/health` | Service health probe |

The settings UI uses `/api/notification-recipients` through the API Gateway.

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
