import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import { users, type UserRow } from '../../../database/schema/users.schema';
import * as schema from '../../../database/schema/users.schema';

import { User } from '../../domain/entities/user.entity';
import {
  type FindUsersFilters,
  type FindUsersResult,
  type UserRepository,
} from '../../domain/repositories/user.repository';

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(user: User): Promise<User> {
    const data = user.toObject();

    const [created] = await this.db
      .insert(users)
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

  async findById(userId: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();

    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findAll(filters?: FindUsersFilters): Promise<FindUsersResult> {
    const conditions: SQL[] = [];

    if (filters?.role) {
      conditions.push(eq(users.role, filters.role));
    }

    if (filters?.status) {
      conditions.push(eq(users.status, filters.status));
    }

    if (filters?.search?.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;

      conditions.push(
        or(
          ilike(users.email, searchTerm),
          ilike(users.displayName, searchTerm),
        )!,
      );
    }

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(whereCondition)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),

      this.db
        .select({
          total: count(),
        })
        .from(users)
        .where(whereCondition),
    ]);

    return {
      items: rows.map((row) => this.toDomain(row)),
      total: totalRows[0]?.total ?? 0,
    };
  }

  async update(user: User): Promise<User> {
    const data = user.toObject();

    const [updated] = await this.db
      .update(users)
      .set({
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        role: data.role,
        status: data.status,
        lastLoginAt: data.lastLoginAt,
        updatedAt: data.updatedAt,
      })
      .where(eq(users.userId, data.userId))
      .returning();

    if (!updated) {
      throw new Error(`User ${data.userId} not found`);
    }

    return this.toDomain(updated);
  }

  private toDomain(row: UserRow): User {
    return User.restore({
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
}
