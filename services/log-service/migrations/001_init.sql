CREATE TABLE IF NOT EXISTS log_projects (
  project_id uuid PRIMARY KEY,
  name text NOT NULL,
  owner_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS log_project_members (
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  user_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('OWNER', 'MAINTAINER', 'VIEWER')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS log_project_members_user_idx ON log_project_members(user_id);

CREATE TABLE IF NOT EXISTS log_api_tokens (
  token_id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  prefix text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS log_api_tokens_project_idx ON log_api_tokens(project_id);

CREATE TABLE IF NOT EXISTS log_idempotency (
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  idempotency_key text NOT NULL,
  payload_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED')),
  accepted_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS log_idempotency_created_idx ON log_idempotency(created_at);

CREATE TABLE IF NOT EXISTS log_monthly_usage (
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  month_start date NOT NULL,
  accepted_records bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, month_start)
);

CREATE TABLE IF NOT EXISTS log_accepted_batches (
  batch_id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  accepted_at timestamptz NOT NULL,
  accepted_count integer NOT NULL
);

CREATE TABLE IF NOT EXISTS log_project_activity (
  activity_id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES log_projects(project_id),
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  resource_id uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS log_project_activity_project_time_idx
  ON log_project_activity(project_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS log_audit_outbox (
  event_id uuid PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX IF NOT EXISTS log_audit_outbox_pending_idx
  ON log_audit_outbox(created_at) WHERE published_at IS NULL;
