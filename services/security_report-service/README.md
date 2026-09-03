# Security and Report Service

This service owns two related operational records: immutable audit entries and
generated monitoring reports. The folder retains its existing
`security_report-service` name for compatibility.

See the [root README](../../README.md) for the full architecture and stack setup.

## Audit Responsibilities

- Consume audit events from RabbitMQ.
- Validate and persist actor, action, resource, result, metadata, and event time.
- Provide filtered audit-log queries for administrators.
- Keep audit ingestion separate from the availability of the originating
  service's HTTP request path.

## Report Responsibilities

- Generate an all-assets or single-asset report for a requested time range.
- Read asset, metric, health-check, and alert summaries from their owning
  services.
- Populate the versioned Word template in `templates/`.
- Convert the rendered document to PDF with LibreOffice.
- Persist generation status and failure details.
- Store completed PDF files under `storage/reports`.
- Generate the previous month's all-assets report at midnight on the first day
  of each month in the `Asia/Bangkok` time zone.

## HTTP API

The service listens on port `3006`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/audit-logs` | Filter and list audit records |
| `GET` | `/reports` | List generated reports |
| `GET` | `/reports/:id` | Get report metadata and status |
| `GET` | `/reports/:id/download` | Download a completed PDF |
| `POST` | `/reports/generate` | Generate an on-demand report |

The dashboard accesses these endpoints as `/api/audit-logs` and `/api/reports`
through the API Gateway.

## Persistence and Dependencies

- PostgreSQL stores audit records and report metadata.
- RabbitMQ supplies audit events.
- Asset, Monitoring, and Alerting services supply report data over HTTP.
- LibreOffice performs DOCX-to-PDF conversion.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3006` |
| `DATABASE_URL` | Security/report PostgreSQL connection string |
| `RABBITMQ_URL` | RabbitMQ connection string |
| `RABBITMQ_AUDIT_QUEUE` | Incoming audit queue; defaults to `audit_events` |
| `ASSET_SERVICE_URL` | Asset service base URL |
| `MONITORING_SERVICE_URL` | Monitoring service base URL |
| `ALERTING_SERVICE_URL` | Alerting service base URL |
| `LIBREOFFICE_PATH` | LibreOffice executable path |
| `REPORT_TEMPLATE_PATH` | DOCX template path; defaults to `templates/monitoring-report-template.docx` |
| `REPORT_TEMPLATE_VERSION` | Template version stored with report metadata |

Docker persists generated PDFs in the `report_storage` volume.

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

When changing the Word template or its data mapping, render a real PDF and
inspect its layout in addition to running unit tests.
