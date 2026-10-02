# Log service

The service receives customer-reported JSON records, assigns a server envelope,
and exposes one Log & Event Explorer per project. It also observes its own Log
API requests. These are distinct sources of information: receiving a record
named `auth.login` does not verify that a login happened in the customer's app.

## Storage and setup

- PostgreSQL stores projects, tokens, request receipts, complete record JSONB,
  search columns, rules, and findings. New records use `log_event_records`.
- RabbitMQ confirms durable queue admission before the API returns HTTP 202.
  A worker inserts records into PostgreSQL; search visibility can lag behind 202.
- Redis caches token lookups, enforces the shared 600 request per rolling minute
  project limit, buffers per-minute metric counters, and stages HTTP request
  receipts until RabbitMQ confirms them. The gateway also limits ingestion by
  the connecting IP and project token before forwarding to this service. If a
  reverse proxy forwards API traffic, its IP shares one gateway limit unless
  client IP handling is configured at that trusted edge.
- InfluxDB bucket `log_metrics` stores only aggregated per-minute request and
  ingestion metrics. New raw logs are never written there.

Configure `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `INFLUXDB_URL`,
`INFLUXDB_TOKEN`, `INFLUXDB_ORG`, `INFLUXDB_LOG_METRICS_BUCKET` (default
`log_metrics`), `AUTH_SERVICE_URL`, and `INTERNAL_SERVICE_SECRET`. The optional
`LOG_RATE_LIMIT_RPM` defaults to 600. The Influx token needs permission to
create the metrics bucket. Run `npm install`, `npm run db:migrate`, and
`npm run start:dev`. Compose runs migrations on service startup.

**Existing data:** migrations `003_generic_log_records.sql` and
`004_ingestion_batch_status.sql` add records and batch tracking. Existing
accepted batches are marked `UNKNOWN` because their processing history cannot
be reconstructed.
It does not erase the older Activity tables or raw Influx bucket. Historical
records in those stores are not automatically copied into the new Explorer:
the old Activity projection lacks the original customer payload, and the old
Influx application series cannot reconstruct one. Review a historical data
backfill separately before removing the legacy tables and bucket. No database
migration or data backfill is run by editing this repository.

## Send a record

Create a project token in the dashboard. Use one token per sending system so
each can be rotated independently. Tokens from the same project share records
and the RPM limit. The secret is shown only at creation.

```powershell
$token = 'prj_live_REPLACE_ME'
$body = @'
{
  "source": "payment_gateway",
  "event_type": "provider_timeout",
  "message": "Payment provider timed out",
  "severity": "WARN",
  "status_code": 504,
  "context": { "provider": "example", "attempt": 2 }
}
'@
Invoke-RestMethod -Uri 'https://YOUR_HOST/api/ingest/logs' -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $body
```

Every record requires nonempty `source` and `event_type` strings. The customer
chooses the event name. `message`, `severity` (`INFO`, `WARN`, `ERROR`,
`CRITICAL`; lower case accepted), `timestamp`, `duration_ms`, `status_code`,
`user_id`, `client.ip`, `client.location`, and `tags` are optional indexed or
display fields. Other JSON fields may contain nested objects or arrays within
the eight-level depth and 1 MB request limit. They are preserved in
`rawPayload` and visible in the inline JSON inspector, but cannot be searched or used
for record rules in this version. A customer-supplied `project_id` stays in
raw JSON and cannot override the project derived from the token.

Send one object, an array, or `{ "events": [...] }` with 1–500 records. The
`events` envelope is recognized only when it is the sole top-level key and is
an array; a single record may use `events` as a custom field. Leading and
trailing whitespace in `source` and `event_type` is removed from indexed values,
while the original JSON is preserved. A bad
record rejects the entire batch with its `events[index].field` in HTTP 400.
Event timestamps may be at most 30 days old or five minutes ahead. When absent,
the server uses receive time and marks `timeSource: "received"`. No source,
message, login result, IP, or severity is inferred.

An optional `Idempotency-Key` protects retries of the exact same body for 24
hours per project. Reusing it with different content returns 409; retrying the
same accepted body returns 202 with `duplicate: true` and adds no records.

### Common responses

| Status | Meaning |
| --- | --- |
| 202 | RabbitMQ durably accepted the batch; `acceptedRecords` reports its size and `batchId` identifies it. |
| 400 | JSON or a required/standard field is invalid; the response names the failing index. |
| 401 | Missing, invalid, or revoked project token. |
| 409 | Idempotency key is already in progress or was used for another body. |
| 413 | Body exceeds 1 MB. |
| 429 | Project used more than its allowed requests in the last rolling 60 seconds. |
| 503 | Ingestion dependency or queue unavailable; retry with the same idempotency key. |

After 202, call `GET /api/ingest/logs/receipts/<batchId>` with the same project
Bearer token to check `QUEUED`, `STORED`, or `FAILED`. `UNKNOWN` applies only to
historical batches created before tracking. A duplicate idempotent request
returns the original `batchId` when available. The receipt may briefly be absent
if the database was unavailable after RabbitMQ accepted the batch; retry the
status request. Open the project's Log & Event Explorer to inspect stored records.
Its inline inspector shows the raw payload and a separate envelope with
project, token ID/name, request ID, server event ID, receive time, and storage
status. It never shows the token secret. Recent valid-token rejection reasons
appear on the project page. Gateway-blocked 429 responses do not reach the log
service and therefore are absent from its request receipts and project counters.
Invalid-token requests that reach the log service have no attributable project
and are shown only as a system-level rate to global admins.

## Search and rules

`GET /api/projects/:id/logs` is member-only. Its default range is the last 24
hours of **received time**. Filters include source, event type, severity, and
the search syntax `source:payments`, `event_type:provider_timeout`,
`severity:WARN`, `user_id:u123`, `tag:payments`, `ip:203.0.*`,
`status_code >= 400`, `duration_ms < 1000`, or plain message words. Multiple
terms use AND. An unindexed custom key returns `Unsupported search field`.
The response includes current-range facets and a received-time histogram.

Project owners can create two kinds of count rule:

- `LOG_API_REQUESTS`: server-observed HTTP status or accepted/rejected result,
  grouped by project or token ID. Every Log API request, including a rejected
  one, can contribute after its response is sent.
- `ACCEPTED_RECORDS`: customer-reported event type and supported field value,
  grouped by project, token ID, IP, or user ID when present. Only records whose
  event timestamp differs from receive time by at most five minutes and that
  were received after the rule was enabled contribute. Older records remain
  searchable but do not trigger these rules.

Rule preview and list show recent matching data or `Waiting for data`.
Findings identify their data source, condition, group, count, and window. A
group produces at most one finding per window. Members can read findings;
only owners manage rules. No notification is sent in this release.

New records, request receipts, and findings are retained for 30 days. The
worker retries failed processing through durable retry queues and sends
exhausted messages to durable dead-letter queues. Receipt publishing retries
from Redis until RabbitMQ confirms it. The future warm/cold storage
port is in `src/log-events/domain/ports/activity-archive.port.ts`.

The 100,000 records per project per day and typical two-second 24-hour search
are design targets. They still require measurement against representative data.
`GET /health/ready` checks PostgreSQL, Redis, InfluxDB and RabbitMQ.
