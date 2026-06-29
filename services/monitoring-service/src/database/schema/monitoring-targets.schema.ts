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
