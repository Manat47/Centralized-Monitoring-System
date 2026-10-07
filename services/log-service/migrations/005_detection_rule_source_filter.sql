ALTER TABLE log_detection_rules
  ADD COLUMN IF NOT EXISTS source_filter text;

ALTER TABLE log_detection_rules
  ADD CONSTRAINT log_detection_rules_source_filter_length
  CHECK (source_filter IS NULL OR (length(source_filter) BETWEEN 1 AND 100));
