-- Preserve archived rows. Only current rules participate in the new uniqueness invariant.
-- Abort before changing data if old current rules disagree on their comparison direction.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM metric_rules WHERE threshold_value NOT BETWEEN 0 AND 100) THEN
    RAISE EXCEPTION 'Metric rule migration: threshold outside 0..100; correct the rows first';
  END IF;
  IF EXISTS (
    SELECT 1 FROM metric_rules WHERE archived_at IS NULL
    GROUP BY asset_id, metric_type
    HAVING COUNT(DISTINCT operator) > 1
  ) THEN
    RAISE EXCEPTION 'Metric rule migration: conflicting operators for one asset and metric; reconcile these rules first';
  END IF;
END $$;--> statement-breakpoint
DROP INDEX "metric_rules_active_configuration_unique";--> statement-breakpoint
ALTER TYPE "public"."metric_rule_evaluation_status" ADD VALUE 'WARNING';--> statement-breakpoint
ALTER TYPE "public"."metric_rule_evaluation_status" ADD VALUE 'CRITICAL';--> statement-breakpoint
ALTER TYPE "public"."metric_rule_evaluation_status" ADD VALUE 'NO_DATA';--> statement-breakpoint
ALTER TYPE "public"."metric_rule_evaluation_status" ADD VALUE 'INACTIVE';--> statement-breakpoint
ALTER TABLE "metric_rules" ADD COLUMN "critical_threshold" real;--> statement-breakpoint
ALTER TABLE "metric_rules" ADD COLUMN "critical_duration_seconds" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "metric_rule_evaluation_states" ADD COLUMN "critical_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "metric_rule_evaluation_states" ADD COLUMN "active_alert_severity" "metric_rule_severity";--> statement-breakpoint
-- A historical single-tier rule keeps its configured tier. The other tier is
-- derived 10 percentage points away, within 0..100, then reviewed in the UI.
UPDATE metric_rules SET
  critical_threshold = CASE
    WHEN severity = 'CRITICAL' THEN GREATEST(1, threshold_value)
    ELSE LEAST(100, GREATEST(1, threshold_value + 10))
  END,
  critical_duration_seconds = CASE
    WHEN severity = 'CRITICAL' THEN GREATEST(10, duration_seconds)
    ELSE 60
  END;--> statement-breakpoint
UPDATE metric_rules SET duration_seconds = GREATEST(10, duration_seconds);--> statement-breakpoint
-- For duplicate active rules, use the lowest threshold/duration for Warning
-- and highest threshold/duration for Critical. Keep the oldest rule ID stable.
WITH grouped AS (
  SELECT asset_id, metric_type, COUNT(*) AS count_rules,
    MIN(threshold_value) AS warning_threshold,
    MAX(threshold_value) AS critical_threshold,
    (ARRAY_AGG(GREATEST(10, duration_seconds) ORDER BY threshold_value ASC, created_at ASC, rule_id ASC))[1] AS warning_duration,
    (ARRAY_AGG(GREATEST(10, duration_seconds) ORDER BY threshold_value DESC, created_at ASC, rule_id ASC))[1] AS critical_duration
  FROM metric_rules WHERE archived_at IS NULL
  GROUP BY asset_id, metric_type
), winners AS (
  SELECT DISTINCT ON (asset_id, metric_type) rule_id, asset_id, metric_type
  FROM metric_rules WHERE archived_at IS NULL
  ORDER BY asset_id, metric_type, created_at ASC, rule_id ASC
)
UPDATE metric_rules AS rule SET
  threshold_value = grouped.warning_threshold,
  duration_seconds = grouped.warning_duration,
  critical_threshold = grouped.critical_threshold,
  critical_duration_seconds = grouped.critical_duration
FROM grouped JOIN winners USING (asset_id, metric_type)
WHERE grouped.count_rules > 1 AND grouped.critical_threshold > grouped.warning_threshold
  AND rule.rule_id = winners.rule_id;--> statement-breakpoint
-- Retain non-winning rows as archived history; do not delete them.
WITH ranked AS (
  SELECT rule_id, ROW_NUMBER() OVER (
    PARTITION BY asset_id, metric_type ORDER BY created_at ASC, rule_id ASC
  ) AS rank_no
  FROM metric_rules WHERE archived_at IS NULL
)
UPDATE metric_rules AS rule SET archived_at = now(), enabled = false
FROM ranked WHERE ranked.rule_id = rule.rule_id AND ranked.rank_no > 1;--> statement-breakpoint
-- Convert each remaining Critical-only or equal-threshold rule to a valid pair.
UPDATE metric_rules SET
  threshold_value = LEAST(99, GREATEST(0,
    CASE WHEN severity = 'CRITICAL' THEN threshold_value - 10 ELSE threshold_value END
  )),
  duration_seconds = CASE WHEN severity = 'WARNING' THEN GREATEST(10, duration_seconds) ELSE 30 END,
  critical_threshold = GREATEST(critical_threshold, 1)
WHERE threshold_value >= critical_threshold;--> statement-breakpoint
-- Archived rows also need valid dual-tier values for domain restoration.
UPDATE metric_rules SET threshold_value = GREATEST(0, critical_threshold - 1)
WHERE threshold_value >= critical_threshold;--> statement-breakpoint
UPDATE metric_rule_evaluation_states AS state SET
  active_alert_severity = rule.severity,
  critical_since = CASE WHEN rule.severity = 'CRITICAL' THEN state.violated_since ELSE NULL END
FROM metric_rules AS rule
WHERE state.rule_id = rule.rule_id AND state.status = 'ALERTED' AND rule.archived_at IS NULL;--> statement-breakpoint
ALTER TABLE "metric_rules" RENAME COLUMN "operator" TO "comparison_operator";--> statement-breakpoint
ALTER TABLE "metric_rules" ALTER COLUMN "comparison_operator" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "metric_rules" ALTER COLUMN "comparison_operator" TYPE varchar(2) USING (
  CASE "comparison_operator"::text WHEN 'GREATER_THAN' THEN '>' ELSE '>=' END
);--> statement-breakpoint
ALTER TABLE "metric_rules" ALTER COLUMN "comparison_operator" SET DEFAULT '>=';--> statement-breakpoint
ALTER TABLE "metric_rules" RENAME COLUMN "threshold_value" TO "warning_threshold";--> statement-breakpoint
ALTER TABLE "metric_rules" ALTER COLUMN "warning_threshold" TYPE real USING "warning_threshold"::real;--> statement-breakpoint
ALTER TABLE "metric_rules" RENAME COLUMN "duration_seconds" TO "warning_duration_seconds";--> statement-breakpoint
ALTER TABLE "metric_rules" ALTER COLUMN "warning_duration_seconds" SET DEFAULT 30;--> statement-breakpoint
ALTER TABLE "metric_rules" RENAME COLUMN "enabled" TO "is_enabled";--> statement-breakpoint
ALTER TABLE "metric_rules" ALTER COLUMN "critical_threshold" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "metric_rules_active_asset_metric_unique" ON "metric_rules" USING btree ("asset_id", "metric_type") WHERE "archived_at" IS NULL;--> statement-breakpoint
ALTER TABLE "metric_rules" DROP COLUMN "severity";
