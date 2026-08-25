import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import { RefreshSession } from '../../domain/entities/refresh-session.entity';
import {
  ACCESS_TOKEN,
  type AccessToken,
} from '../../domain/ports/access-token.port';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/ports/password-hasher.port';
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

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
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
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,

    @Inject(ACCESS_TOKEN)
    private readonly accessToken: AccessToken,

    @Inject(REFRESH_TOKEN)
    private readonly refreshToken: RefreshToken,

    @Inject(REFRESH_SESSION_REPOSITORY)
    private readonly refreshSessionRepository: RefreshSessionRepository,

    private readonly configService: ConfigService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const userData = user.toObject();

    if (userData.status !== 'ACTIVE' || !userData.passwordHash) {
      throw new UnauthorizedException('User account is not active');
    }

    const passwordMatches = await this.passwordHasher.compare(
      input.password,
      userData.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    user.recordLogin();

    const updatedUser = await this.userRepository.update(user);

    const updatedData = updatedUser.toObject();

    const accessToken = await this.accessToken.sign({
      sub: updatedData.userId,
      email: updatedData.email,
      role: updatedData.role,
    });

    const sessionId = randomUUID();
    const refreshSecret = this.refreshToken.generateSecret();

    const rawRefreshToken = this.refreshToken.build(sessionId, refreshSecret);

    const refreshTokenExpiresAt = this.createRefreshTokenExpiration();

    const refreshSession = RefreshSession.create(sessionId, {
      userId: updatedData.userId,
      tokenHash: this.refreshToken.hash(refreshSecret),
      expiresAt: refreshTokenExpiresAt,
    });

    await this.refreshSessionRepository.create(refreshSession);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenExpiresAt,
      tokenType: 'Bearer',

      user: {
        userId: updatedData.userId,
        email: updatedData.email,
        displayName: updatedData.displayName,
        role: updatedData.role,
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
