import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const verificationStatusEnum = pgEnum('verification_status', [
  'NOT_VERIFIED',
  'VERIFIED',
  'FAILED',
]);

export const metricRuleTypeEnum = pgEnum('metric_rule_type', [
  'CPU_USAGE',
  'MEMORY_USAGE',
  'DISK_USAGE',
]);

export const metricRuleOperatorEnum = pgEnum('metric_rule_operator', [
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUAL',
]);

export const metricRuleSeverityEnum = pgEnum('metric_rule_severity', [
  'WARNING',
  'CRITICAL',
]);

export const monitoringTargets = pgTable('monitoring_targets', {
  targetId: uuid('target_id').defaultRandom().primaryKey(),

  assetId: uuid('asset_id').notNull().unique(),

  host: varchar('host', { length: 255 }).notNull(),

  port: integer('port').default(9100).notNull(),

  path: varchar('path', { length: 255 }).default('/metrics').notNull(),

  scrapeIntervalSeconds: integer('scrape_interval_seconds')
    .default(15)
    .notNull(),

  verificationStatus: verificationStatusEnum('verification_status')
    .default('NOT_VERIFIED')
    .notNull(),

  monitoringEnabled: boolean('monitoring_enabled').default(false).notNull(),

  lastVerifiedAt: timestamp('last_verified_at', {
    withTimezone: true,
  }),

  lastCollectedAt: timestamp('last_collected_at', {
    withTimezone: true,
  }),

  lastError: text('last_error'),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export type MonitoringTargetRow = typeof monitoringTargets.$inferSelect;
export type NewMonitoringTargetRow = typeof monitoringTargets.$inferInsert;

export const metricRules = pgTable('metric_rules', {
  ruleId: uuid('rule_id').defaultRandom().primaryKey(),

  assetId: uuid('asset_id').notNull(),

  metricType: metricRuleTypeEnum('metric_type').notNull(),

  operator: metricRuleOperatorEnum('operator')
    .default('GREATER_THAN_OR_EQUAL')
    .notNull(),

  thresholdValue: integer('threshold_value').notNull(),

  durationSeconds: integer('duration_seconds').default(300).notNull(),

  severity: metricRuleSeverityEnum('severity').notNull(),

  enabled: boolean('enabled').default(true).notNull(),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export type MetricRuleRow = typeof metricRules.$inferSelect;
export type NewMetricRuleRow = typeof metricRules.$inferInsert;
