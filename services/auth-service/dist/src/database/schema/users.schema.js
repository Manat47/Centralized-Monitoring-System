"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.userStatusEnum = exports.userRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', ['ADMIN', 'OPERATOR']);
exports.userStatusEnum = (0, pg_core_1.pgEnum)('user_status', ['ACTIVE', 'INACTIVE']);
exports.users = (0, pg_core_1.pgTable)('users', {
    userId: (0, pg_core_1.uuid)('user_id').primaryKey(),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
    displayName: (0, pg_core_1.text)('display_name').notNull(),
    role: (0, exports.userRoleEnum)('role').notNull(),
    status: (0, exports.userStatusEnum)('status').notNull(),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at', {
        withTimezone: true,
    }),
    createdAt: (0, pg_core_1.timestamp)('created_at', {
        withTimezone: true,
    }).notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', {
        withTimezone: true,
    }).notNull(),
});
//# sourceMappingURL=users.schema.js.map