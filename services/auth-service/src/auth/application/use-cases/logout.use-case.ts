import { Inject, Injectable } from '@nestjs/common';

import {
  REFRESH_TOKEN,
  type RefreshToken,
} from '../../domain/ports/refresh-token.port';
import {
  REFRESH_SESSION_REPOSITORY,
  type RefreshSessionRepository,
} from '../../domain/repositories/refresh-session.repository';

export interface LogoutInput {
  refreshToken?: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN)
    private readonly refreshTokenService: RefreshToken,

    @Inject(REFRESH_SESSION_REPOSITORY)
    private readonly refreshSessionRepository: RefreshSessionRepository,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    if (!input.refreshToken) {
      return;
    }

    const parsed = this.refreshTokenService.parse(input.refreshToken);

    if (!parsed) {
      return;
    }

    const session = await this.refreshSessionRepository.findById(
      parsed.sessionId,
    );

    if (!session || session.isRevoked()) {
      return;
    }

    session.revoke();

    await this.refreshSessionRepository.update(session);
  }
}
