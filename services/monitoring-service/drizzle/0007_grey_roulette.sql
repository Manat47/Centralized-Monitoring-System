ALTER TABLE "monitoring_targets" ADD COLUMN IF NOT EXISTS "verified_config_fingerprint" varchar(64);--> statement-breakpoint
UPDATE "monitoring_targets"
SET
  "verification_status" = 'NOT_VERIFIED',
  "monitoring_enabled" = false
WHERE "verification_status" = 'VERIFIED';
