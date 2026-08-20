import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const reports = pgTable('reports', {
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

  status: text('status').notNull(),

  summary: jsonb('summary').$type<Record<string, unknown>>(),

  pdfPath: text('pdf_path'),

  generatedAt: timestamp('generated_at', {
    withTimezone: true,
  }),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull(),
});

export type ReportRow = typeof reports.$inferSelect;
export type NewReportRow = typeof reports.$inferInsert;
