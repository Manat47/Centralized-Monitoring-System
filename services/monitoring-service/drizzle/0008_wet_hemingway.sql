ALTER TABLE "health_check_targets" ALTER COLUMN "enabled" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "health_check_targets" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "health_check_targets_active_asset_url_unique" ON "health_check_targets" USING btree ("asset_id","url") WHERE "health_check_targets"."archived_at" is null;