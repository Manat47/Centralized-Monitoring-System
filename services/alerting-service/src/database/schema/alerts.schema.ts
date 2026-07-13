import {
  doublePrecision,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const alertStatusEnum = pgEnum('alert_status', [
  'TRIGGERED',
  'RESOLVED',
]);

export const alertSeverityEnum = pgEnum('alert_severity', [
  'WARNING',
  'CRITICAL',
]);

export const alerts = pgTable('alerts', {
  alertId: uuid('alert_id').primaryKey(),
  ruleId: uuid('rule_id').notNull(),
  assetId: uuid('asset_id').notNull(),
  metricType: text('metric_type').notNull(),
  severity: alertSeverityEnum('severity').notNull(),
  status: alertStatusEnum('status').notNull(),
  thresholdValue: doublePrecision('threshold_value').notNull(),
  actualValue: doublePrecision('actual_value'),
  message: text('message').notNull(),
  triggeredAt: timestamp('triggered_at', {
    withTimezone: true,
  }).notNull(),
  resolvedAt: timestamp('resolved_at', {
    withTimezone: true,
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull(),
});

export type AlertRow = typeof alerts.$inferSelect;
export type NewAlertRow = typeof alerts.$inferInsert;
