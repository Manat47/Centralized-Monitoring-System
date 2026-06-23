import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const targetTypeEnum = pgEnum('target_type', [
  'SERVER',
  'APPLICATION',
  'SERVICE',
]);

export const environmentEnum = pgEnum('environment', [
  'PRODUCTION',
  'STAGING',
  'DEVELOPMENT',
]);

export const assetStatusEnum = pgEnum('asset_status', [
  'ACTIVATE',
  'INACTIVATE',
  'DEACTIVATE',
]);

export const assets = pgTable('assets', {
  assetId: uuid('asset_id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  targetType: targetTypeEnum('target_type').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  endpoint: varchar('endpoint', { length: 2048 }),
  environment: environmentEnum('environment').notNull(),
  status: assetStatusEnum('status').default('ACTIVATE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('update_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
