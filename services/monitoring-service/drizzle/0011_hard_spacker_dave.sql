DROP INDEX "monitoring_targets_asset_type_unique";--> statement-breakpoint
ALTER TABLE "monitoring_targets" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "monitoring_targets_active_asset_type_unique" ON "monitoring_targets" USING btree ("asset_id","monitoring_type") WHERE "monitoring_targets"."archived_at" is null;