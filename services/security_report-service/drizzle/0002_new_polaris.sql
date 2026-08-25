ALTER TABLE "audit_logs" ALTER COLUMN "resource_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "schema_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_email" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "resource_name" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "source_service" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "error_code" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "ingested_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "audit_logs" SET "event_id" = "audit_log_id" WHERE "event_id" IS NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "event_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "source_service" DROP DEFAULT;--> statement-breakpoint
CREATE UNIQUE INDEX "audit_logs_event_id_idx" ON "audit_logs" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_action_occurred_at_idx" ON "audit_logs" USING btree ("action","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_occurred_at_idx" ON "audit_logs" USING btree ("resource_type","resource_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_occurred_at_idx" ON "audit_logs" USING btree ("actor_user_id","occurred_at");
