CREATE TYPE "public"."monitoring_protocol" AS ENUM('HTTP', 'HTTPS');--> statement-breakpoint
ALTER TABLE "monitoring_targets" ADD COLUMN "protocol" "monitoring_protocol";