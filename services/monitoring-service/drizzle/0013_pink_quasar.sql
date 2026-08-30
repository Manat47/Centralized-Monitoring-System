ALTER TABLE "monitoring_targets" ADD COLUMN "last_attempted_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "monitoring_targets"
SET "last_attempted_at" = "last_collected_at"
WHERE "last_collected_at" IS NOT NULL;
