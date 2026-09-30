# Log service

This service owns Projects, memberships, write-only API tokens, ingestion, usage,
and the project Log Explorer. Activity Logs and detection rules extend the same
event pipeline. It uses PostgreSQL for configuration and accepted
request accounting, Redis for token lookups and 60-second request counts,
RabbitMQ for durable ingestion and management audit messages, and a dedicated
InfluxDB `app_logs` bucket with 30-day retention.

## Local setup

Set `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `INFLUXDB_URL`,
`INFLUXDB_TOKEN`, `INFLUXDB_ORG`, `INFLUXDB_LOG_BUCKET`, `AUTH_SERVICE_URL`,
`INTERNAL_SERVICE_SECRET`, and optionally `LOG_RATE_LIMIT_RPM` (default 600).
The same secret must be configured in the API
gateway and auth service. Run `npm install`, `npm run db:migrate`, then
`npm run start:dev`. The Compose image runs the migration before service startup.

The service creates its InfluxDB log bucket on startup with a 30-day retention
rule. The configured InfluxDB token must be permitted to create buckets.

## Public ingestion

`POST /api/ingest/logs` accepts one object, an array of objects, or an object
with an `events` array. Send `Authorization: Bearer prj_live_...`; optionally
send a unique `Idempotency-Key` for a retryable request. The key is scoped to
the token's project for 24 hours. The API returns `202` after RabbitMQ confirms
the persistent message. A repeat with the same key and payload returns `202`
without counting or storing the records twice. A different payload with the
same key returns `409`.

Application events require `source`, `event_type`, and `message`. Activity events
can be marked with `kind: "activity"` or inferred from `auth.*` event types and
the new fields; for activity, the server derives `source` and `message` when
missing. The example below is accepted by the same endpoint:

```json
{
  "event_id": "evt_987654321",
  "event_type": "auth.login",
  "user_id": "usr_10293",
  "severity": "info",
  "client": { "ip": "203.0.113.195", "device_type": "Desktop" },
  "metrics": { "duration_ms": 1420 },
  "tags": ["auth", "web"],
  "metadata": { "status": "success", "session_id": "sess_abc123" }
}
```

`event_id` becomes `externalEventId` for reference; the server assigns its own
event ID. To calculate session duration, send a subsequent `auth.logout` with
the same `metadata.session_id`. Until logout arrives, the latest session has
no duration. `metrics.duration_ms` measures the event operation, not the session.
Only a successful login with `metadata.status: "success"` opens a session and
counts toward Total Logins and Active Days.

`timestamp` defaults
to server time; it may be at most 30 days old or five minutes ahead. Optional
fields include `tenant_id`, `status_code`, `duration_ms`, `client`, `metrics`,
`tags`, and `metadata`. `client` supports IP, user agent, location and device;
tags contain at most 10 distinct strings; metadata accepts up to 16 scalar or
null values, without nested objects. The server derives `project_id` from the
token and rejects it in input. The whole batch is rejected if one event is
invalid. A request can contain at most 500 records and 1 MB of JSON.

Tokens are shown only when created. Store them in the third-party system's
secret store. Revocation deletes the shared Redis cache entry; new requests
must validate against the current token state. Token names and activity events
never contain token secrets or ingested log contents.

## Dashboard endpoints

`/api/projects` is available only with a dashboard JWT through the gateway.
Project membership is checked by this service for every project endpoint;
global `ADMIN` does not bypass it. Owners manage members and tokens,
maintainers manage tokens, and viewers read logs, usage, and activity.
The existing global Audit Logs page remains admin-only and receives only
project/member/token/rule management events. Each project also exposes its own
management activity to members. Ingested log records never enter audit storage.

Usage shows requests made with a valid project token during the last rolling
60 seconds, including rejected and retried requests, plus accepted records in
the current Asia/Bangkok month. Invalid-token requests are counted separately
at `/api/projects/invalid-rpm` for global admins. These numbers are displayed
with a per-project limit of 600 requests per rolling 60 seconds by default.
The excess request is counted and receives HTTP 429, including when it would
otherwise be a retry or invalid payload. The monthly record total remains
informational.

## Activity analysis and retention

The worker writes full Activity events into the InfluxDB hot bucket and a
project-scoped PostgreSQL search projection. High-cardinality user, IP and
session values stay in fields, not Influx tags. PostgreSQL indexes support
time, user, IP, event type and tag filters. Activity records, rule match rows,
sessions and findings are removed after 30 days; InfluxDB enforces the same
hot retention. The `receivedAt` field records when our API accepted the event,
while `timestamp` records the time claimed by the client.
The RabbitMQ worker processes one message at a time on this node to preserve
window order. A failed write is retried through a durable two-second delay queue
up to ten times; then the original payload is placed in the durable dead-letter
queue for operator replay. Reprocessing uses the server event ID to avoid
duplicate index rows and findings.

Dashboard members can search `/api/projects/:id/activity-logs`, read
`activity-insights`, `activity-rules`, and `activity-findings`. Only an OWNER
can create, enable or disable detection rules. A rule compares an event type
and one field value, groups by IP or user ID, and counts matches in its time
window. Only events whose timestamp is within five minutes of receipt can
match; a rule never scans historical events at creation or re-enabling. A group produces at
most one finding in a window. Findings appear in the project dashboard; this
release does not send notifications.

`src/log-events/domain/ports/activity-archive.port.ts` defines the seam for a
future warm and cold tier. No data is copied beyond 30 days in this release.
Before enabling archival, add a durable export checkpoint, object storage
credentials, restore/read routing, retention policy, and an audited purge job.
Capacity and the target of roughly two seconds for a 24-hour search at up to
100,000 events per project per day require a load benchmark with production
like data; the build and unit tests do not establish that latency.

`GET /health/ready` checks PostgreSQL, Redis, InfluxDB and the presence of
RabbitMQ channels. The API gateway includes Log Service in Platform Healthy.

## HTTPS preparation

The public API must sit behind HTTPS in production. The repository includes
`infrastructure/nginx/https.example.conf` as a deployment template. Supply a
domain and TLS certificate/key, mount the template as the Nginx config and the
certificate files at its stated paths, and expose port 443. Deployment and
certificate provisioning are outside this feature change.
