CREATE TYPE "public"."metric_rule_evaluation_status" AS ENUM('NORMAL', 'VIOLATING', 'ALERTED', 'RECOVERED');--> statement-breakpoint
CREATE TABLE "metric_rule_evaluation_states" (
	"state_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"status" "metric_rule_evaluation_status" DEFAULT 'NORMAL' NOT NULL,
	"violated_since" timestamp with time zone,
	"last_evaluated_at" timestamp with time zone,
	"last_actual_value" integer,
	"last_triggered_at" timestamp with time zone,
	"recovered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metric_rule_evaluation_states_rule_id_unique" UNIQUE("rule_id")
);
