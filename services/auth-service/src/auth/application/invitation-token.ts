import { createHash, randomBytes } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';

export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createInvitationExpiration(configService: ConfigService): Date {
  const expiresInHours = Number(
    configService.get<string>('USER_INVITATION_EXPIRES_IN_HOURS') ?? '48',
  );

  if (!Number.isInteger(expiresInHours) || expiresInHours <= 0) {
    throw new Error(
      'USER_INVITATION_EXPIRES_IN_HOURS must be a positive integer',
    );
  }

  return new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
}

export function buildInvitationUrl(
  configService: ConfigService,
  token: string,
): string {
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3010';

  return `${frontendUrl.replace(/\/$/, '')}/accept-invitation?token=${encodeURIComponent(token)}`;
}
