CREATE TYPE "public"."asset_status" AS ENUM('ACTIVATE', 'INACTIVATE', 'DEACTIVATE');--> statement-breakpoint
CREATE TYPE "public"."environment" AS ENUM('PRODUCTION', 'STAGING', 'DEVELOPMENT');--> statement-breakpoint
CREATE TYPE "public"."target_type" AS ENUM('SERVER', 'APPLICATION', 'SERVICE');--> statement-breakpoint
CREATE TABLE "assets" (
	"asset_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"target_type" "target_type" NOT NULL,
	"ip_address" varchar(45),
	"endpoint" varchar(2048),
	"environment" "environment" NOT NULL,
	"status" "asset_status" DEFAULT 'ACTIVATE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"update_at" timestamp with time zone DEFAULT now() NOT NULL
);
