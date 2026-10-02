ALTER TABLE "health_check_targets" ALTER COLUMN "asset_id" SET DATA TYPE text USING "asset_id"::text;--> statement-breakpoint
ALTER TABLE "health_check_targets" ALTER COLUMN "asset_id" DROP NOT NULL;
