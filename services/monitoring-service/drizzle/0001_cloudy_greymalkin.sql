CREATE TYPE "public"."metric_rule_operator" AS ENUM('GREATER_THAN', 'GREATER_THAN_OR_EQUAL');--> statement-breakpoint
CREATE TYPE "public"."metric_rule_severity" AS ENUM('WARNING', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."metric_rule_type" AS ENUM('CPU_USAGE', 'MEMORY_USAGE', 'DISK_USAGE');--> statement-breakpoint
CREATE TABLE "metric_rules" (
	"rule_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"metric_type" "metric_rule_type" NOT NULL,
	"operator" "metric_rule_operator" DEFAULT 'GREATER_THAN_OR_EQUAL' NOT NULL,
	"threshold_value" integer NOT NULL,
	"duration_seconds" integer DEFAULT 300 NOT NULL,
	"severity" "metric_rule_severity" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
