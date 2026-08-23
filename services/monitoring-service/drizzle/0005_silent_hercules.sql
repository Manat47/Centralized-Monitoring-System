CREATE TABLE IF NOT EXISTS "health_check_targets" (
	"health_check_target_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"url" varchar(2048) NOT NULL,
	"check_interval_seconds" integer DEFAULT 15 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "monitoring_targets" DROP COLUMN "host";