ALTER TABLE "reports" ADD COLUMN "generated_by_email" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "template_version" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "failure_code" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "failure_message" text;--> statement-breakpoint
CREATE INDEX "reports_created_at_idx" ON "reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reports_status_created_at_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_active_monthly_period_idx" ON "reports" USING btree ("report_type","period_start","period_end") WHERE "reports"."report_type" = 'MONTHLY' AND "reports"."status" IN ('GENERATING', 'COMPLETED');