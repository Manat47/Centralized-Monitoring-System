CREATE TYPE "public"."monitoring_type" AS ENUM('NODE_EXPORTER', 'PROMETHEUS_APPLICATION');--> statement-breakpoint
ALTER TABLE "monitoring_targets" DROP CONSTRAINT "monitoring_targets_asset_id_unique";--> statement-breakpoint
ALTER TABLE "monitoring_targets" ALTER COLUMN "port" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "monitoring_targets" ALTER COLUMN "path" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "monitoring_targets" ADD COLUMN "monitoring_type" "monitoring_type" DEFAULT 'NODE_EXPORTER' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "monitoring_targets_asset_type_unique" ON "monitoring_targets" USING btree ("asset_id","monitoring_type");