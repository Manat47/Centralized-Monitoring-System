CREATE TABLE "alert_lifecycle_events" (
	"lifecycle_event_id" uuid PRIMARY KEY NOT NULL,
	"alert_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"context" jsonb,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_check_alert_states" (
	"health_check_target_id" uuid PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"state" text DEFAULT 'UNKNOWN' NOT NULL,
	"check_interval_seconds" integer NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"consecutive_successes" integer DEFAULT 0 NOT NULL,
	"last_result_at" timestamp with time zone,
	"last_status_code" integer,
	"last_response_time_ms" integer,
	"last_error" text,
	"stale_alerted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_alert_events" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "rule_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "threshold_value" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "source_type" text;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "source_id" uuid;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "alert_type" text;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "dedup_key" text;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "actual_text" text;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "context" jsonb;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "acknowledged_by" uuid;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "closed_by" uuid;--> statement-breakpoint
UPDATE "alerts"
SET
	"source_type" = 'METRIC_RULE',
	"source_id" = "rule_id",
	"alert_type" = 'METRIC_THRESHOLD',
	"dedup_key" = 'METRIC_RULE:' || "rule_id"::text || ':METRIC_THRESHOLD';--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "source_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "source_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "alert_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "dedup_key" SET NOT NULL;--> statement-breakpoint
INSERT INTO "alert_lifecycle_events" (
	"lifecycle_event_id", "alert_id", "event_type", "reason", "occurred_at"
)
SELECT gen_random_uuid(), "alert_id", 'TRIGGERED', "message", "triggered_at"
FROM "alerts";--> statement-breakpoint
INSERT INTO "alert_lifecycle_events" (
	"lifecycle_event_id", "alert_id", "event_type", "occurred_at"
)
SELECT gen_random_uuid(), "alert_id", 'ACKNOWLEDGED', "acknowledged_at"
FROM "alerts" WHERE "acknowledged_at" IS NOT NULL;--> statement-breakpoint
INSERT INTO "alert_lifecycle_events" (
	"lifecycle_event_id", "alert_id", "event_type", "reason", "occurred_at"
)
SELECT gen_random_uuid(), "alert_id", 'RESOLVED', "resolution_reason", "resolved_at"
FROM "alerts" WHERE "resolved_at" IS NOT NULL;--> statement-breakpoint
INSERT INTO "alert_lifecycle_events" (
	"lifecycle_event_id", "alert_id", "event_type", "occurred_at"
)
SELECT gen_random_uuid(), "alert_id", 'CLOSED', "closed_at"
FROM "alerts" WHERE "closed_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "alert_lifecycle_events_alert_idx" ON "alert_lifecycle_events" USING btree ("alert_id");--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_active_dedup_key_unique" ON "alerts" USING btree ("dedup_key") WHERE "alerts"."status" in ('TRIGGERED', 'ACKNOWLEDGED');--> statement-breakpoint
CREATE INDEX "alerts_source_idx" ON "alerts" USING btree ("source_type","source_id");
