import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

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
]);

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

    if (PUBLIC_ROUTES.has(path)) {
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
