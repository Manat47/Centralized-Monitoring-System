# Log service

This service owns Projects, memberships, write-only API tokens, ingestion, usage,
and the project Log Explorer. It uses PostgreSQL for configuration and accepted
request accounting, Redis for token lookups and 60-second request counts,
RabbitMQ for durable ingestion and management audit messages, and a dedicated
InfluxDB `app_logs` bucket with 30-day retention.

## Local setup

Set `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `INFLUXDB_URL`,
`INFLUXDB_TOKEN`, `INFLUXDB_ORG`, `INFLUXDB_LOG_BUCKET`, `AUTH_SERVICE_URL`,
and `INTERNAL_SERVICE_SECRET`. The same secret must be configured in the API
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

Each event requires `source`, `event_type`, and `message`. `timestamp` defaults
to server time; it may be at most 30 days old or five minutes ahead. Optional
fields are `tenant_id`, `status_code`, `duration_ms`, and `metadata`. Metadata
accepts up to 16 primitive values. The server derives `project_id` from the
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
project/member/token management events. Each project also exposes its own
management activity to members. Ingested log records never enter audit storage.

Usage shows requests made with a valid project token during the last rolling
60 seconds, including rejected and retried requests, plus accepted records in
the current Asia/Bangkok month. Invalid-token requests are counted separately
at `/api/projects/invalid-rpm` for global admins. These numbers are displayed
without enforcing a request or monthly quota.

## HTTPS preparation

The public API must sit behind HTTPS in production. The repository includes
`infrastructure/nginx/https.example.conf` as a deployment template. Supply a
domain and TLS certificate/key, mount the template as the Nginx config and the
certificate files at its stated paths, and expose port 443. Deployment and
certificate provisioning are outside this feature change.
