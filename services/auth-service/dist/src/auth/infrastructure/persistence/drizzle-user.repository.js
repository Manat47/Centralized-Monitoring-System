"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrizzleUserRepository = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const database_provider_1 = require("../../../database/database.provider");
const users_schema_1 = require("../../../database/schema/users.schema");
const user_entity_1 = require("../../domain/entities/user.entity");
let DrizzleUserRepository = class DrizzleUserRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(user) {
        const data = user.toObject();
        const [created] = await this.db
            .insert(users_schema_1.users)
            .values({
            userId: data.userId,
            email: data.email,
            passwordHash: data.passwordHash,
            displayName: data.displayName,
            role: data.role,
            status: data.status,
            lastLoginAt: data.lastLoginAt,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        })
            .returning();
        if (!created) {
            throw new Error('Failed to create user');
        }
        return this.toDomain(created);
    }
    async findById(userId) {
        const [row] = await this.db
            .select()
            .from(users_schema_1.users)
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.userId, userId))
            .limit(1);
        return row ? this.toDomain(row) : null;
    }
    async findByEmail(email) {
        const normalizedEmail = email.trim().toLowerCase();
        const [row] = await this.db
            .select()
            .from(users_schema_1.users)
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.email, normalizedEmail))
            .limit(1);
        return row ? this.toDomain(row) : null;
    }
    async findAll(filters) {
        const conditions = [];
        if (filters?.role) {
            conditions.push((0, drizzle_orm_1.eq)(users_schema_1.users.role, filters.role));
        }
        if (filters?.status) {
            conditions.push((0, drizzle_orm_1.eq)(users_schema_1.users.status, filters.status));
        }
        if (filters?.search?.trim()) {
            const searchTerm = `%${filters.search.trim()}%`;
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(users_schema_1.users.email, searchTerm), (0, drizzle_orm_1.ilike)(users_schema_1.users.displayName, searchTerm)));
        }
        const whereCondition = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 20;
        const offset = (page - 1) * limit;
        const [rows, totalRows] = await Promise.all([
            this.db
                .select()
                .from(users_schema_1.users)
                .where(whereCondition)
                .orderBy((0, drizzle_orm_1.desc)(users_schema_1.users.createdAt))
                .limit(limit)
                .offset(offset),
            this.db
                .select({
                total: (0, drizzle_orm_1.count)(),
            })
                .from(users_schema_1.users)
                .where(whereCondition),
        ]);
        return {
            items: rows.map((row) => this.toDomain(row)),
            total: totalRows[0]?.total ?? 0,
        };
    }
    async update(user) {
        const data = user.toObject();
        const [updated] = await this.db
            .update(users_schema_1.users)
            .set({
            email: data.email,
            passwordHash: data.passwordHash,
            displayName: data.displayName,
            role: data.role,
            status: data.status,
            lastLoginAt: data.lastLoginAt,
            updatedAt: data.updatedAt,
        })
            .where((0, drizzle_orm_1.eq)(users_schema_1.users.userId, data.userId))
            .returning();
        if (!updated) {
            throw new Error(`User ${data.userId} not found`);
        }
        return this.toDomain(updated);
    }
    toDomain(row) {
        return user_entity_1.User.restore({
            userId: row.userId,
            email: row.email,
            passwordHash: row.passwordHash,
            displayName: row.displayName,
            role: row.role,
            status: row.status,
            lastLoginAt: row.lastLoginAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        });
    }
};
exports.DrizzleUserRepository = DrizzleUserRepository;
exports.DrizzleUserRepository = DrizzleUserRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_provider_1.DRIZZLE_DB)),
    __metadata("design:paramtypes", [Function])
], DrizzleUserRepository);
//# sourceMappingURL=drizzle-user.repository.js.map