-- New writes use this schema. Historical activity tables remain available for a
-- separately reviewed backfill; the old session KPI is no longer queried.
CREATE TABLE IF NOT EXISTS log_event_records (
  server_event_id uuid PRIMARY KEY,
  request_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  token_id uuid REFERENCES log_api_tokens(token_id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL,
  event_time timestamptz NOT NULL,
  time_source text NOT NULL CHECK (time_source IN ('client', 'received')),
  source text NOT NULL,
  event_type text NOT NULL,
  severity text CHECK (severity IN ('INFO','WARN','ERROR','CRITICAL')),
  duration_ms double precision,
  status_code integer,
  message text,
  user_id text,
  client_ip text,
  location text,
  tags text[] NOT NULL DEFAULT '{}',
  raw_payload jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'STORED'
);
CREATE INDEX IF NOT EXISTS log_records_project_time_idx ON log_event_records(project_id,received_at DESC,server_event_id DESC);
CREATE INDEX IF NOT EXISTS log_records_source_idx ON log_event_records(project_id,source,received_at DESC);
CREATE INDEX IF NOT EXISTS log_records_type_idx ON log_event_records(project_id,event_type,received_at DESC);
CREATE INDEX IF NOT EXISTS log_records_severity_idx ON log_event_records(project_id,severity,received_at DESC);
CREATE INDEX IF NOT EXISTS log_records_ip_idx ON log_event_records(project_id,client_ip,received_at DESC) WHERE client_ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS log_records_location_idx ON log_event_records(project_id,location,received_at DESC) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS log_records_status_idx ON log_event_records(project_id,status_code,received_at DESC) WHERE status_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS log_records_duration_idx ON log_event_records(project_id,duration_ms,received_at DESC) WHERE duration_ms IS NOT NULL;
CREATE INDEX IF NOT EXISTS log_records_user_idx ON log_event_records(project_id,user_id,received_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS log_records_tags_idx ON log_event_records USING gin(tags);

CREATE TABLE IF NOT EXISTS log_ingest_requests (
  request_id uuid PRIMARY KEY,
  project_id uuid REFERENCES log_projects(project_id),
  token_id uuid REFERENCES log_api_tokens(token_id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL,
  http_status integer NOT NULL,
  rejection_reason text,
  accepted_records integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS log_ingest_requests_project_time_idx ON log_ingest_requests(project_id,received_at DESC);
CREATE INDEX IF NOT EXISTS log_ingest_requests_status_idx ON log_ingest_requests(project_id,http_status,received_at DESC);

CREATE TABLE IF NOT EXISTS log_detection_rules (
  rule_id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  name text NOT NULL,
  event_type text NOT NULL,
  data_source text NOT NULL DEFAULT 'ACCEPTED_RECORDS' CHECK (data_source IN ('ACCEPTED_RECORDS','LOG_API_REQUESTS')),
  condition_field text NOT NULL,
  condition_value text NOT NULL,
  group_by text NOT NULL CHECK (group_by IN ('project', 'client.ip', 'user_id', 'token_id')),
  threshold integer NOT NULL CHECK (threshold BETWEEN 2 AND 1000),
  window_minutes integer NOT NULL CHECK (window_minutes BETWEEN 1 AND 60),
  enabled boolean NOT NULL DEFAULT true,
  activated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS log_detection_rules_project_idx ON log_detection_rules(project_id) WHERE archived_at IS NULL;
CREATE TABLE IF NOT EXISTS log_detection_rule_events (
  rule_id uuid NOT NULL REFERENCES log_detection_rules(rule_id),
  event_id uuid NOT NULL REFERENCES log_event_records(server_event_id),
  group_value text NOT NULL,
  received_at timestamptz NOT NULL,
  PRIMARY KEY (rule_id,event_id)
);
CREATE INDEX IF NOT EXISTS log_detection_rule_events_window_idx ON log_detection_rule_events(rule_id,group_value,received_at DESC);
CREATE TABLE IF NOT EXISTS log_detection_request_events (
  rule_id uuid NOT NULL REFERENCES log_detection_rules(rule_id),
  request_id uuid NOT NULL REFERENCES log_ingest_requests(request_id),
  group_value text NOT NULL,
  received_at timestamptz NOT NULL,
  PRIMARY KEY (rule_id,request_id)
);
CREATE INDEX IF NOT EXISTS log_detection_request_events_window_idx ON log_detection_request_events(rule_id,group_value,received_at DESC);
CREATE TABLE IF NOT EXISTS log_detection_findings (
  finding_id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  rule_id uuid NOT NULL REFERENCES log_detection_rules(rule_id),
  group_value text NOT NULL,
  matched_count integer NOT NULL,
  triggered_at timestamptz NOT NULL,
  window_start timestamptz NOT NULL,
  event_id uuid REFERENCES log_event_records(server_event_id),
  request_id uuid REFERENCES log_ingest_requests(request_id),
  CHECK ((event_id IS NULL) <> (request_id IS NULL)),
  UNIQUE(rule_id,event_id),
  UNIQUE(rule_id,request_id)
);
CREATE INDEX IF NOT EXISTS log_detection_findings_project_idx ON log_detection_findings(project_id,triggered_at DESC);
