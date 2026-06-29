CREATE TYPE "public"."verification_status" AS ENUM('NOT_VERIFIED', 'VERIFIED', 'FAILED');--> statement-breakpoint
CREATE TABLE "monitoring_targets" (
	"target_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"host" varchar(255) NOT NULL,
	"port" integer DEFAULT 9100 NOT NULL,
	"path" varchar(255) DEFAULT '/metrics' NOT NULL,
	"scrape_interval_seconds" integer DEFAULT 15 NOT NULL,
	"verification_status" "verification_status" DEFAULT 'NOT_VERIFIED' NOT NULL,
	"monitoring_enabled" boolean DEFAULT false NOT NULL,
	"last_verified_at" timestamp with time zone,
	"last_collected_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitoring_targets_asset_id_unique" UNIQUE("asset_id")
);
