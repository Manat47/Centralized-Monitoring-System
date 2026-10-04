CREATE TABLE "notification_settings" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"is_fallback_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_recipients" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD COLUMN "channel" varchar(16) DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD COLUMN "name" varchar(120);--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD COLUMN "destination" text;--> statement-breakpoint
UPDATE "notification_recipients"
SET "name" = left("email", 120), "destination" = "email";--> statement-breakpoint
ALTER TABLE "notification_recipients" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_recipients" ALTER COLUMN "destination" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD COLUMN "secret_token" text;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD COLUMN "is_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD COLUMN "priority" integer;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_channel_check" CHECK ("notification_recipients"."channel" in ('email', 'line', 'slack', 'webhook'));--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_email_check" CHECK ("notification_recipients"."channel" <> 'email' or "notification_recipients"."email" is not null);--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_priority_check" CHECK ("notification_recipients"."priority" is null or "notification_recipients"."priority" > 0);
--> statement-breakpoint
INSERT INTO "notification_settings" ("id", "is_fallback_enabled") VALUES ('global', false);
