ALTER TABLE "monitoring_targets" ADD COLUMN "verified_config_fingerprint" varchar(64);
UPDATE "monitoring_targets"

--> statement-breakpoint
SET
  "verification_status" = 'NOT_VERIFIED',
  "monitoring_enabled" = false
WHERE "verification_status" = 'VERIFIED';