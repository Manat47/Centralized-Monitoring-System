import type { RefreshSession } from '../entities/refresh-session.entity';

export const REFRESH_SESSION_REPOSITORY = Symbol('REFRESH_SESSION_REPOSITORY');

export interface RefreshSessionRepository {
  create(session: RefreshSession): Promise<RefreshSession>;

  findById(sessionId: string): Promise<RefreshSession | null>;

  update(session: RefreshSession): Promise<RefreshSession>;

  revokeAllByUserId(userId: string, revokedAt: Date): Promise<void>;
}
