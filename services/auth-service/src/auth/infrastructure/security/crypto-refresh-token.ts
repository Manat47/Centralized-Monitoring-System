import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import type {
  ParsedRefreshToken,
  RefreshToken,
} from '../../domain/ports/refresh-token.port';

@Injectable()
export class CryptoRefreshToken implements RefreshToken {
  generateSecret(): string {
    return randomBytes(48).toString('base64url');
  }

  build(sessionId: string, secret: string): string {
    return `${sessionId}.${secret}`;
  }

  parse(token: string): ParsedRefreshToken | null {
    const separatorIndex = token.indexOf('.');

    if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
      return null;
    }

    const sessionId = token.slice(0, separatorIndex);
    const secret = token.slice(separatorIndex + 1);

    if (!sessionId || !secret) {
      return null;
    }

    return {
      sessionId,
      secret,
    };
  }

  hash(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  verify(secret: string, expectedHash: string): boolean {
    const actualHash = this.hash(secret);

    const actualBuffer = Buffer.from(actualHash, 'hex');

    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }
}
