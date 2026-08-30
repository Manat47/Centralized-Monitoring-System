import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

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

export const metricRuleEvaluationStatusEnum = pgEnum(
  'metric_rule_evaluation_status',
  ['NORMAL', 'VIOLATING', 'ALERTED', 'RECOVERED'],
);

export const monitoringTypeEnum = pgEnum('monitoring_type', [
  'NODE_EXPORTER',
  'PROMETHEUS_APPLICATION',
]);

export const monitoringProtocolEnum = pgEnum('monitoring_protocol', [
  'HTTP',
  'HTTPS',
]);

export const monitoringAddressSourceEnum = pgEnum('monitoring_address_source', [
  'HOSTNAME',
  'IP_ADDRESS',
]);

export const monitoringTargets = pgTable(
  'monitoring_targets',
  {
    targetId: uuid('target_id').defaultRandom().primaryKey(),

    assetId: uuid('asset_id').notNull(),

    monitoringType: monitoringTypeEnum('monitoring_type')
      .default('NODE_EXPORTER')
      .notNull(),

    protocol: monitoringProtocolEnum('protocol'),

    addressSource: monitoringAddressSourceEnum('address_source'),

    port: integer('port').notNull(),

    path: varchar('path', { length: 255 }).notNull(),

    scrapeIntervalSeconds: integer('scrape_interval_seconds')
      .default(15)
      .notNull(),

    verificationStatus: verificationStatusEnum('verification_status')
      .default('NOT_VERIFIED')
      .notNull(),

    verifiedConfigFingerprint: varchar('verified_config_fingerprint', {
      length: 64,
    }),

    monitoringEnabled: boolean('monitoring_enabled').default(false).notNull(),

    archivedAt: timestamp('archived_at', {
      withTimezone: true,
    }),

    lastVerifiedAt: timestamp('last_verified_at', {
      withTimezone: true,
    }),

    lastAttemptedAt: timestamp('last_attempted_at', {
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
  },
  (table) => [
    uniqueIndex('monitoring_targets_active_asset_type_unique')
      .on(table.assetId, table.monitoringType)
      .where(sql`${table.archivedAt} is null`),
  ],
);

export type MonitoringTargetRow = typeof monitoringTargets.$inferSelect;
export type NewMonitoringTargetRow = typeof monitoringTargets.$inferInsert;

export const healthCheckTargets = pgTable(
  'health_check_targets',
  {
    healthCheckTargetId: uuid('health_check_target_id')
      .defaultRandom()
      .primaryKey(),

    assetId: uuid('asset_id').notNull(),

    url: varchar('url', { length: 2048 }).notNull(),

    checkIntervalSeconds: integer('check_interval_seconds')
      .default(15)
      .notNull(),

    enabled: boolean('enabled').default(true).notNull(),

    archivedAt: timestamp('archived_at', {
      withTimezone: true,
    }),

    lastCheckedAt: timestamp('last_checked_at', {
      withTimezone: true,
    }),

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
  },
  (table) => [
    uniqueIndex('health_check_targets_active_asset_url_unique')
      .on(table.assetId, table.url)
      .where(sql`${table.archivedAt} is null`),
  ],
);

export type HealthCheckTargetRow = typeof healthCheckTargets.$inferSelect;
export type NewHealthCheckTargetRow = typeof healthCheckTargets.$inferInsert;

export const metricRules = pgTable(
  'metric_rules',
  {
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

    archivedAt: timestamp('archived_at', { withTimezone: true }),

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
  },
  (table) => [
    uniqueIndex('metric_rules_active_configuration_unique')
      .on(
        table.assetId,
        table.metricType,
        table.operator,
        table.thresholdValue,
        table.durationSeconds,
        table.severity,
      )
      .where(sql`${table.archivedAt} is null`),
  ],
);

export type MetricRuleRow = typeof metricRules.$inferSelect;
export type NewMetricRuleRow = typeof metricRules.$inferInsert;

export const metricRuleEvaluationStates = pgTable(
  'metric_rule_evaluation_states',
  {
    stateId: uuid('state_id').defaultRandom().primaryKey(),

    ruleId: uuid('rule_id').notNull().unique(),

    assetId: uuid('asset_id').notNull(),

    status: metricRuleEvaluationStatusEnum('status')
      .default('NORMAL')
      .notNull(),

    violatedSince: timestamp('violated_since', {
      withTimezone: true,
    }),

    lastEvaluatedAt: timestamp('last_evaluated_at', {
      withTimezone: true,
    }),

    lastSampleAt: timestamp('last_sample_at', {
      withTimezone: true,
    }),

    lastActualValue: real('last_actual_value'),

    lastTriggeredAt: timestamp('last_triggered_at', {
      withTimezone: true,
    }),

    recoveredAt: timestamp('recovered_at', {
      withTimezone: true,
    }),

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
  },
);

export type MetricRuleEvaluationStateRow =
  typeof metricRuleEvaluationStates.$inferSelect;
export type NewMetricRuleEvaluationStateRow =
  typeof metricRuleEvaluationStates.$inferInsert;
