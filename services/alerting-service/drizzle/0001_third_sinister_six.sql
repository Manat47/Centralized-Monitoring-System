ALTER TYPE "public"."alert_status" ADD VALUE 'ACKNOWLEDGED' BEFORE 'RESOLVED';--> statement-breakpoint
ALTER TYPE "public"."alert_status" ADD VALUE 'CLOSED';--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "acknowledged_at" timestamp with time zone;