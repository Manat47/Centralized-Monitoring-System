ALTER TABLE log_accepted_batches
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text;

ALTER TABLE log_accepted_batches
  ADD CONSTRAINT log_accepted_batches_processing_status_check
  CHECK (processing_status IN ('UNKNOWN', 'QUEUED', 'STORED', 'FAILED'));

CREATE INDEX IF NOT EXISTS log_accepted_batches_project_time_idx
  ON log_accepted_batches(project_id, accepted_at DESC);

ALTER TABLE log_idempotency ADD COLUMN IF NOT EXISTS batch_id uuid;
