ALTER TABLE "health_check_targets" ALTER COLUMN "check_interval_seconds" SET DEFAULT 30;--> statement-breakpoint
ALTER TABLE "health_check_targets" ADD COLUMN "consecutive_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "health_check_targets" ADD COLUMN "alert_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "health_check_targets" ADD COLUMN "last_heartbeat_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "health_check_targets" SET "check_interval_seconds" = 30 WHERE "check_interval_seconds" < 30;
--> statement-breakpoint
ALTER TABLE "health_check_targets" ADD CONSTRAINT "health_check_targets_interval_min_30" CHECK ("check_interval_seconds" >= 30);
