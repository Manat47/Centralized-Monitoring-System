CREATE TYPE "public"."monitoring_address_source" AS ENUM('HOSTNAME', 'IP_ADDRESS');--> statement-breakpoint
ALTER TABLE "monitoring_targets" ADD COLUMN "address_source" "monitoring_address_source";