CREATE TABLE IF NOT EXISTS activity_event_index (
  event_id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  event_type text NOT NULL,
  source text NOT NULL,
  message text NOT NULL,
  severity text,
  user_id text,
  client_ip text,
  device_type text,
  session_id text,
  outcome text,
  tags text[] NOT NULL DEFAULT '{}',
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS activity_project_time_idx
  ON activity_event_index(project_id, occurred_at DESC, event_id DESC);
CREATE INDEX IF NOT EXISTS activity_project_user_time_idx
  ON activity_event_index(project_id, user_id, occurred_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS activity_project_ip_time_idx
  ON activity_event_index(project_id, client_ip, occurred_at DESC) WHERE client_ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS activity_project_type_time_idx
  ON activity_event_index(project_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_tags_idx ON activity_event_index USING gin(tags);
CREATE INDEX IF NOT EXISTS activity_received_idx ON activity_event_index(received_at);

CREATE TABLE IF NOT EXISTS activity_rules (
  rule_id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  name text NOT NULL,
  event_type text NOT NULL,
  condition_field text NOT NULL,
  condition_value text NOT NULL,
  group_by text NOT NULL CHECK (group_by IN ('client.ip', 'user_id')),
  threshold integer NOT NULL CHECK (threshold BETWEEN 2 AND 1000),
  window_minutes integer NOT NULL CHECK (window_minutes BETWEEN 1 AND 60),
  enabled boolean NOT NULL DEFAULT true,
  activated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS activity_rules_project_idx
  ON activity_rules(project_id) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS activity_rule_events (
  rule_id uuid NOT NULL REFERENCES activity_rules(rule_id),
  event_id uuid NOT NULL REFERENCES activity_event_index(event_id),
  group_value text NOT NULL,
  received_at timestamptz NOT NULL,
  PRIMARY KEY (rule_id, event_id)
);
CREATE INDEX IF NOT EXISTS activity_rule_events_window_idx
  ON activity_rule_events(rule_id, group_value, received_at DESC);
CREATE INDEX IF NOT EXISTS activity_rule_events_received_idx
  ON activity_rule_events(received_at);

CREATE TABLE IF NOT EXISTS activity_findings (
  finding_id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  rule_id uuid NOT NULL REFERENCES activity_rules(rule_id),
  group_value text NOT NULL,
  matched_count integer NOT NULL,
  triggered_at timestamptz NOT NULL,
  window_start timestamptz NOT NULL,
  event_id uuid NOT NULL REFERENCES activity_event_index(event_id),
  UNIQUE (rule_id, event_id)
);
CREATE INDEX IF NOT EXISTS activity_findings_project_time_idx
  ON activity_findings(project_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS activity_findings_cooldown_idx
  ON activity_findings(rule_id, group_value, triggered_at DESC);

CREATE TABLE IF NOT EXISTS activity_sessions (
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  session_id text NOT NULL,
  user_id text,
  login_at timestamptz NOT NULL,
  logout_at timestamptz,
  duration_ms bigint,
  client_ip text,
  device_type text,
  PRIMARY KEY (project_id, session_id)
);
CREATE INDEX IF NOT EXISTS activity_sessions_latest_idx
  ON activity_sessions(project_id, login_at DESC);
