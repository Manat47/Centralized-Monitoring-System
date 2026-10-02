import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import type Redis from 'ioredis';

type UserRole = 'ADMIN' | 'OPERATOR';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

const PUBLIC_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/invitations/validate',
  '/api/auth/invitations/accept',
  '/api/metrics',
  '/api/ingest/logs',
]);

const INGEST_PATH = '/api/ingest/logs';

export function createGatewayIngestRateLimit(redis: Redis, limit = 600) {
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error('LOG_RATE_LIMIT_RPM must be a positive integer');
  return async (request: Request, response: Response, next: NextFunction) => {
    const path = request.originalUrl.split('?')[0];
    if (
      (request.method !== 'POST' || path !== INGEST_PATH) &&
      (request.method !== 'GET' ||
        !/^\/api\/ingest\/logs\/receipts\/[0-9a-f-]+$/i.test(path))
    ) {
      next();
      return;
    }
    const now = Date.now();
    const ip = request.socket.remoteAddress ?? 'unknown';
    const ipKey = `gateway:ingest:ip:${createHash('sha256').update(ip).digest('hex')}`;
    const token = /^Bearer (prj_live_[A-Za-z0-9_-]+)$/.exec(
      request.headers.authorization ?? '',
    )?.[1];
    const keys = token
      ? [
          ipKey,
          `gateway:ingest:token:${createHash('sha256').update(token).digest('hex')}`,
        ]
      : [ipKey];
    try {
      const permitted = Number(
        await redis.eval(
          `for i=1,#KEYS do
           redis.call('ZREMRANGEBYSCORE',KEYS[i],'-inf',ARGV[1])
           if redis.call('ZCARD',KEYS[i]) >= tonumber(ARGV[2]) then return 0 end
         end
         for i=1,#KEYS do
           redis.call('ZADD',KEYS[i],ARGV[3],ARGV[4])
           redis.call('EXPIRE',KEYS[i],120)
         end
         return 1`,
          keys.length,
          ...keys,
          now - 60_000,
          limit,
          now,
          `${now}:${randomUUID()}`,
        ),
      );
      if (!permitted) {
        response
          .status(429)
          .json({ statusCode: 429, message: 'Log API rate limit exceeded' });
        return;
      }
      next();
    } catch {
      response
        .status(503)
        .json({ statusCode: 503, message: 'Log API rate limiter unavailable' });
    }
  };
}

function extractAccessToken(request: Request): string | null {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return null;
  }

  const [type, token] = authorization.split(' ');

  if (type !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function isAccessTokenPayload(payload: unknown): payload is AccessTokenPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.sub === 'string' &&
    typeof candidate.email === 'string' &&
    (candidate.role === 'ADMIN' || candidate.role === 'OPERATOR')
  );
}

export function createGatewayAuthMiddleware(
  jwtService: JwtService,
  configService: ConfigService,
) {
  return async function gatewayAuthMiddleware(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    if (request.method === 'OPTIONS') {
      next();
      return;
    }

    const path = request.originalUrl.split('?')[0];
    delete request.headers['x-user-id'];
    delete request.headers['x-user-email'];
    delete request.headers['x-user-role'];
    delete request.headers['x-internal-service-secret'];

    if (
      PUBLIC_ROUTES.has(path) ||
      (request.method === 'GET' &&
        /^\/api\/ingest\/logs\/receipts\/[0-9a-f-]+$/i.test(path))
    ) {
      next();
      return;
    }

    const accessToken = extractAccessToken(request);

    if (!accessToken) {
      response.status(401).json({
        statusCode: 401,
        message: 'Access token is required',
        error: 'Unauthorized',
      });

      return;
    }

    const secret = configService.get<string>('JWT_ACCESS_SECRET');

    if (!secret) {
      response.status(500).json({
        statusCode: 500,
        message: 'JWT_ACCESS_SECRET is not configured',
        error: 'Internal Server Error',
      });

      return;
    }

    try {
      const payload = await jwtService.verifyAsync<Record<string, unknown>>(
        accessToken,
        {
          secret,
        },
      );

      if (!isAccessTokenPayload(payload)) {
        response.status(401).json({
          statusCode: 401,
          message: 'Access token payload is invalid',
          error: 'Unauthorized',
        });

        return;
      }

      // ป้องกัน client ปลอม actor headers มาเอง
      delete request.headers['x-user-id'];
      delete request.headers['x-user-email'];
      delete request.headers['x-user-role'];

      request.headers['x-user-id'] = payload.sub;

      request.headers['x-user-email'] = payload.email;

      request.headers['x-user-role'] = payload.role;

      next();
    } catch {
      response.status(401).json({
        statusCode: 401,
        message: 'Access token is invalid or expired',
        error: 'Unauthorized',
      });
    }
  };
}
