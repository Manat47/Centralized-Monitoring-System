DROP INDEX "reports_active_monthly_period_idx";--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "generated_by_role" text;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_active_monthly_period_idx" ON "reports" USING btree ("report_type","period_start","period_end") WHERE "reports"."report_type" = 'MONTHLY' AND "reports"."status" IN ('PENDING', 'GENERATING', 'COMPLETED');