CREATE TABLE "reports" (
	"report_id" uuid PRIMARY KEY NOT NULL,
	"report_type" text NOT NULL,
	"asset_id" uuid,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"generated_by" uuid,
	"status" text NOT NULL,
	"summary" jsonb,
	"pdf_path" text,
	"generated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
