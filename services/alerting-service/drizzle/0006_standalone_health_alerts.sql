ALTER TABLE "alerts" ALTER COLUMN "asset_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "health_check_alert_states" ALTER COLUMN "asset_id" DROP NOT NULL;