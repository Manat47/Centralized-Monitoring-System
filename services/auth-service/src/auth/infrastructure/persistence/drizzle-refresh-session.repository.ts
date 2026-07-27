import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../../../database/database.provider';
import * as schema from '../../../database/schema/database.schema';
import {
  refreshSessions,
  type RefreshSessionRow,
} from '../../../database/schema/refresh_sessions.schema';

import { RefreshSession } from '../../domain/entities/refresh-session.entity';
import type { RefreshSessionRepository } from '../../domain/repositories/refresh-session.repository';

@Injectable()
export class DrizzleRefreshSessionRepository implements RefreshSessionRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(session: RefreshSession): Promise<RefreshSession> {
    const data = session.toObject();

    const [created] = await this.db
      .insert(refreshSessions)
      .values({
        sessionId: data.sessionId,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        revokedAt: data.revokedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create refresh session');
    }

    return this.toDomain(created);
  }

  async findById(sessionId: string): Promise<RefreshSession | null> {
    const [row] = await this.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.sessionId, sessionId))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async update(session: RefreshSession): Promise<RefreshSession> {
    const data = session.toObject();

    const [updated] = await this.db
      .update(refreshSessions)
      .set({
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        revokedAt: data.revokedAt,
        updatedAt: data.updatedAt,
      })
      .where(eq(refreshSessions.sessionId, data.sessionId))
      .returning();

    if (!updated) {
      throw new Error(`Refresh session ${data.sessionId} not found`);
    }

    return this.toDomain(updated);
  }

  async revokeAllByUserId(userId: string, revokedAt: Date): Promise<void> {
    await this.db
      .update(refreshSessions)
      .set({
        revokedAt,
        updatedAt: revokedAt,
      })
      .where(
        and(
          eq(refreshSessions.userId, userId),
          isNull(refreshSessions.revokedAt),
        ),
      );
  }

  private toDomain(row: RefreshSessionRow): RefreshSession {
    return RefreshSession.restore({
      sessionId: row.sessionId,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
