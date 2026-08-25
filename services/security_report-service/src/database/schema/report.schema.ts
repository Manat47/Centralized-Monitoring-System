import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const reports = pgTable(
  'reports',
  {
    reportId: uuid('report_id').primaryKey(),

  reportType: text('report_type').notNull(),

  assetId: uuid('asset_id'),

  periodStart: timestamp('period_start', {
    withTimezone: true,
  }).notNull(),

  periodEnd: timestamp('period_end', {
    withTimezone: true,
  }).notNull(),

  generatedBy: uuid('generated_by'),

  generatedByEmail: text('generated_by_email'),

  status: text('status').notNull(),

  summary: jsonb('summary').$type<Record<string, unknown>>(),

  pdfPath: text('pdf_path'),

  templateVersion: text('template_version'),

  failureCode: text('failure_code'),

  failureMessage: text('failure_message'),

  generatedAt: timestamp('generated_at', {
    withTimezone: true,
  }),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    index('reports_created_at_idx').on(table.createdAt),
    index('reports_status_created_at_idx').on(table.status, table.createdAt),
    uniqueIndex('reports_active_monthly_period_idx')
      .on(table.reportType, table.periodStart, table.periodEnd)
      .where(
        sql`${table.reportType} = 'MONTHLY' AND ${table.status} IN ('GENERATING', 'COMPLETED')`,
      ),
  ],
);

export type ReportRow = typeof reports.$inferSelect;
export type NewReportRow = typeof reports.$inferInsert;
