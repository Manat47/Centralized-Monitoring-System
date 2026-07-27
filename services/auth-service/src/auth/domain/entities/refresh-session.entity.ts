export interface RefreshSessionProps {
  sessionId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRefreshSessionProps {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export class RefreshSession {
  private constructor(private readonly props: RefreshSessionProps) {}

  static create(
    sessionId: string,
    input: CreateRefreshSessionProps,
  ): RefreshSession {
    const now = new Date();

    return new RefreshSession({
      sessionId,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: RefreshSessionProps): RefreshSession {
    return new RefreshSession(props);
  }

  isExpired(now: Date = new Date()): boolean {
    return this.props.expiresAt <= now;
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  revoke(now: Date = new Date()): void {
    if (this.props.revokedAt) {
      return;
    }

    this.props.revokedAt = now;
    this.props.updatedAt = now;
  }

  rotate(tokenHash: string, expiresAt: Date, now: Date = new Date()): void {
    this.props.tokenHash = tokenHash;
    this.props.expiresAt = expiresAt;
    this.props.updatedAt = now;
  }

  toObject(): RefreshSessionProps {
    return { ...this.props };
  }
}
