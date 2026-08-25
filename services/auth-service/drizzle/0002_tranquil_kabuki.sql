ALTER TYPE "public"."user_status" ADD VALUE 'INVITED' BEFORE 'ACTIVE';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invitation_token_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invitation_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invitation_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invitation_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invitation_revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invitation_token_hash_unique" UNIQUE("invitation_token_hash");