import { BadRequestException, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Actor } from '../../project.service';

@Injectable()
export class GatewayActorService {
  fromHeaders(headers: Record<string, string | string[] | undefined>): Actor {
    const secret = process.env.INTERNAL_SERVICE_SECRET;
    const received = headers['x-internal-service-secret'];
    if (
      !secret ||
      typeof received !== 'string' ||
      Buffer.byteLength(secret) !== Buffer.byteLength(received) ||
      !timingSafeEqual(Buffer.from(secret), Buffer.from(received))
    )
      throw new BadRequestException('Gateway authentication is required');
    const userId = headers['x-user-id'];
    const role = headers['x-user-role'];
    const email = headers['x-user-email'];
    if (typeof userId !== 'string' || (role !== 'ADMIN' && role !== 'OPERATOR'))
      throw new BadRequestException('Authenticated user is required');
    return {
      userId,
      role,
      email: typeof email === 'string' ? email : undefined,
    };
  }
}
