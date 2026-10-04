import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const logFindingRules = pgTable(
  'log_finding_rules',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    serviceName: varchar('service_name', { length: 160 }).notNull(),
    searchQuery: text('search_query').notNull(),
    severity: varchar('severity', { length: 16 })
      .$type<'low' | 'medium' | 'high' | 'critical'>()
      .notNull(),
    threshold: integer('threshold').notNull(),
    timeWindowSeconds: integer('time_window_seconds').notNull(),
    cooldownMinutes: integer('cooldown_minutes').default(15).notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('log_finding_rules_enabled_service_idx').on(
      table.isEnabled,
      table.serviceName,
    ),
    check('log_finding_rules_threshold_check', sql`${table.threshold} >= 1`),
    check(
      'log_finding_rules_window_check',
      sql`${table.timeWindowSeconds} >= 1`,
    ),
    check(
      'log_finding_rules_cooldown_check',
      sql`${table.cooldownMinutes} >= 1`,
    ),
    check(
      'log_finding_rules_severity_check',
      sql`${table.severity} in ('low', 'medium', 'high', 'critical')`,
    ),
  ],
);

export const logFindingStates = pgTable(
  'log_finding_states',
  {
    fingerprint: varchar('fingerprint', { length: 64 }).primaryKey(),
    ruleId: uuid('rule_id')
      .notNull()
      .references(() => logFindingRules.id, { onDelete: 'cascade' }),
    firstTriggeredAt: timestamp('first_triggered_at', {
      withTimezone: true,
    }).notNull(),
    lastTriggeredAt: timestamp('last_triggered_at', {
      withTimezone: true,
    }).notNull(),
    suppressedUntil: timestamp('suppressed_until', {
      withTimezone: true,
    }).notNull(),
    currentCount: integer('current_count').notNull(),
  },
  (table) => [
    index('log_finding_states_rule_idx').on(table.ruleId),
    check('log_finding_states_count_check', sql`${table.currentCount} >= 0`),
  ],
);

export type LogFindingRuleRow = typeof logFindingRules.$inferSelect;
export type LogFindingStateRow = typeof logFindingStates.$inferSelect;
