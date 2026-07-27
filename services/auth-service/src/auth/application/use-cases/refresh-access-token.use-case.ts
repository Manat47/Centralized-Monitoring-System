import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  ACCESS_TOKEN,
  type AccessToken,
} from '../../domain/ports/access-token.port';
import {
  REFRESH_TOKEN,
  type RefreshToken,
} from '../../domain/ports/refresh-token.port';
import {
  REFRESH_SESSION_REPOSITORY,
  type RefreshSessionRepository,
} from '../../domain/repositories/refresh-session.repository';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';

export interface RefreshAccessTokenInput {
  refreshToken: string;
}

export interface RefreshAccessTokenOutput {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  tokenType: 'Bearer';

  user: {
    userId: string;
    email: string;
    displayName: string;
    role: 'ADMIN' | 'OPERATOR';
  };
}

@Injectable()
export class RefreshAccessTokenUseCase {
  constructor(
    @Inject(REFRESH_TOKEN)
    private readonly refreshTokenService: RefreshToken,

    @Inject(REFRESH_SESSION_REPOSITORY)
    private readonly refreshSessionRepository: RefreshSessionRepository,

    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,

    @Inject(ACCESS_TOKEN)
    private readonly accessToken: AccessToken,

    private readonly configService: ConfigService,
  ) {}

  async execute(
    input: RefreshAccessTokenInput,
  ): Promise<RefreshAccessTokenOutput> {
    const parsed = this.refreshTokenService.parse(input.refreshToken);

    if (!parsed) {
      throw new UnauthorizedException('Refresh token is invalid');
    }

    const session = await this.refreshSessionRepository.findById(
      parsed.sessionId,
    );

    if (!session) {
      throw new UnauthorizedException('Refresh session not found');
    }

    if (session.isRevoked()) {
      throw new UnauthorizedException('Refresh session has been revoked');
    }

    if (session.isExpired()) {
      session.revoke();

      await this.refreshSessionRepository.update(session);

      throw new UnauthorizedException('Refresh token has expired');
    }

    const sessionData = session.toObject();

    const tokenMatches = this.refreshTokenService.verify(
      parsed.secret,
      sessionData.tokenHash,
    );

    if (!tokenMatches) {
      session.revoke();

      await this.refreshSessionRepository.update(session);

      throw new UnauthorizedException('Refresh token is invalid');
    }

    const user = await this.userRepository.findById(sessionData.userId);

    if (!user) {
      session.revoke();

      await this.refreshSessionRepository.update(session);

      throw new UnauthorizedException('User not found');
    }

    const userData = user.toObject();

    if (userData.status !== 'ACTIVE') {
      session.revoke();

      await this.refreshSessionRepository.update(session);

      throw new UnauthorizedException('User account is inactive');
    }

    const newAccessToken = await this.accessToken.sign({
      sub: userData.userId,
      email: userData.email,
      role: userData.role,
    });

    const newSecret = this.refreshTokenService.generateSecret();

    const newRawRefreshToken = this.refreshTokenService.build(
      sessionData.sessionId,
      newSecret,
    );

    const newExpiresAt = this.createRefreshTokenExpiration();

    session.rotate(this.refreshTokenService.hash(newSecret), newExpiresAt);

    await this.refreshSessionRepository.update(session);

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      refreshTokenExpiresAt: newExpiresAt,
      tokenType: 'Bearer',

      user: {
        userId: userData.userId,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
      },
    };
  }

  private createRefreshTokenExpiration(): Date {
    const expiresInDays = Number(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN_DAYS') ?? '7',
    );

    if (!Number.isInteger(expiresInDays) || expiresInDays <= 0) {
      throw new Error(
        'REFRESH_TOKEN_EXPIRES_IN_DAYS must be a positive integer',
      );
    }

    return new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }
}
