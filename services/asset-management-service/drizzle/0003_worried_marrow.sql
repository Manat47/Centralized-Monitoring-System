ALTER TABLE "assets" DROP CONSTRAINT "assets_agent_id_unique";--> statement-breakpoint
ALTER TABLE "assets" DROP COLUMN "agent_id";--> statement-breakpoint
ALTER TABLE "assets" DROP COLUMN "last-seen_at";