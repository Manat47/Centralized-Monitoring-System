CREATE TYPE "public"."alert_severity" AS ENUM('WARNING', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('TRIGGERED', 'RESOLVED');--> statement-breakpoint
CREATE TABLE "alerts" (
	"alert_id" uuid PRIMARY KEY NOT NULL,
	"rule_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"metric_type" text NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"status" "alert_status" NOT NULL,
	"threshold_value" double precision NOT NULL,
	"actual_value" double precision,
	"message" text NOT NULL,
	"triggered_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
