ALTER TABLE "assets" ADD COLUMN "agent_id" uuid;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "hostname" varchar(255);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "last-seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_agent_id_unique" UNIQUE("agent_id");