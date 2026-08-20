CREATE TABLE "notification_recipients" (
	"recipient_id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "notification_recipients_email_unique" UNIQUE("email")
);
