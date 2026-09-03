# Monitoring Service

The Monitoring service owns metric collection targets, application health
checks, metric rules, evaluation state, and time-series queries.

See the [root README](../../README.md) for the full architecture and stack setup.

## Responsibilities

- Resolve server targets from the selected asset hostname or IP address.
- Verify Node Exporter connectivity before enabling metric collection.
- Collect Prometheus-format metrics and store time series in InfluxDB.
- Pace failed collection retries using the configured scrape interval.
- Check application health URLs and retain individual results.
- Evaluate CPU, memory, and disk rules over a continuous duration.
- Publish alert and audit events.
- Provide summary and historical metric queries for dashboards and reports.

The scheduler wakes every five seconds, then applies each target's own scrape or
check interval. PostgreSQL stores configuration and state; InfluxDB stores metric
and health-check samples.

## Monitoring Semantics

### Server targets

The V1 UI configures `SERVER` assets as `NODE_EXPORTER` targets. A target must be
verified before it can be enabled. Changing its address source or connection
configuration invalidates the previous verification.

The backend also contains `PROMETHEUS_APPLICATION` support for application
metrics, but the V1 dashboard keeps application availability in Health Checks.

### Health checks

Health checks are restricted to `APPLICATION` assets. Multiple full URLs are
allowed per application, while duplicate active `assetId + normalized URL`
combinations are rejected. Checks do not require a successful verification gate
because an already-failing endpoint must still be observable.

### Metric rules

Rules support `CPU_USAGE`, `MEMORY_USAGE`, and `DISK_USAGE` with `GREATER_THAN`
or `GREATER_THAN_OR_EQUAL`, a threshold percentage, a duration, and `WARNING` or
`CRITICAL` severity. A violation must remain continuous for the configured
duration before an alert is published.

## HTTP API

The service listens on port `3001`. Route groups are:

| Route group | Operations |
| --- | --- |
| `/monitoring-targets` | Create, verify, update, enable, disable, archive, collect, list, and query metrics |
| `/health-check-targets` | Create, update, enable, disable, check now, archive, list, and query history |
| `/metric-rules` | Create, update, enable, disable, archive, list, and evaluate |
| `/asset-lifecycle-impact/:assetId` | Summarize monitoring configuration affected by an asset transition |
| `/health` | Process health |
| `/health/ready` | PostgreSQL and InfluxDB readiness |

Browser clients use the same groups under `/api` through the API Gateway.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3001` |
| `DATABASE_URL` | Monitoring PostgreSQL connection string |
| `INFLUXDB_URL` | InfluxDB base URL |
| `INFLUXDB_TOKEN` | InfluxDB API token |
| `INFLUXDB_ORG` | InfluxDB organization |
| `INFLUXDB_BUCKET` | Metrics and health-check bucket |
| `ASSET_SERVICE_URL` | Asset service base URL |
| `ALERTING_SERVICE_URL` | Alerting service base URL for direct event delivery |
| `RABBITMQ_URL` | RabbitMQ connection string |
| `RABBITMQ_ALERT_QUEUE` | Alert event queue |
| `RABBITMQ_AUDIT_QUEUE` | Audit event queue |

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

For an end-to-end collection test, confirm that the machine or container running
this service can reach the target's resolved `/metrics` URL. A successful curl
from the browser machine does not prove that the Monitoring service has the same
network route.
