CREATE TABLE "audit_logs" (
	"audit_log_id" uuid PRIMARY KEY NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"result" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL
);
