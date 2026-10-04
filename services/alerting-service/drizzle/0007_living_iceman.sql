CREATE TABLE "log_finding_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"service_name" varchar(160) NOT NULL,
	"search_query" text NOT NULL,
	"severity" varchar(16) NOT NULL,
	"threshold" integer NOT NULL,
	"time_window_seconds" integer NOT NULL,
	"cooldown_minutes" integer DEFAULT 15 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "log_finding_rules_threshold_check" CHECK ("log_finding_rules"."threshold" >= 1),
	CONSTRAINT "log_finding_rules_window_check" CHECK ("log_finding_rules"."time_window_seconds" >= 1),
	CONSTRAINT "log_finding_rules_cooldown_check" CHECK ("log_finding_rules"."cooldown_minutes" >= 1),
	CONSTRAINT "log_finding_rules_severity_check" CHECK ("log_finding_rules"."severity" in ('low', 'medium', 'high', 'critical'))
);
--> statement-breakpoint
CREATE TABLE "log_finding_states" (
	"fingerprint" varchar(64) PRIMARY KEY NOT NULL,
	"rule_id" uuid NOT NULL,
	"first_triggered_at" timestamp with time zone NOT NULL,
	"last_triggered_at" timestamp with time zone NOT NULL,
	"suppressed_until" timestamp with time zone NOT NULL,
	"current_count" integer NOT NULL,
	CONSTRAINT "log_finding_states_count_check" CHECK ("log_finding_states"."current_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "log_finding_states" ADD CONSTRAINT "log_finding_states_rule_id_log_finding_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."log_finding_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "log_finding_rules_enabled_service_idx" ON "log_finding_rules" USING btree ("is_enabled","service_name");--> statement-breakpoint
CREATE INDEX "log_finding_states_rule_idx" ON "log_finding_states" USING btree ("rule_id");