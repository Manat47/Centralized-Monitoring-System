import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';
import { createGatewayAuthMiddleware } from './gateway-auth.middleware';
import { gatewayAuthorizationMiddleware } from './gateway-authorization.middleware';

describe('log routes at the gateway', () => {
  const response = {} as Response;

  it('passes the ingestion token without treating it as a user JWT and strips spoofed headers', async () => {
    const jwt = { verifyAsync: jest.fn() } as unknown as JwtService;
    const config = { get: jest.fn() } as unknown as ConfigService;
    const request = {
      method: 'POST',
      originalUrl: '/api/ingest/logs',
      headers: {
        authorization: 'Bearer prj_live_test',
        'x-user-id': 'forged',
        'x-internal-service-secret': 'forged',
      },
    } as unknown as Request;
    const next = jest.fn() as NextFunction;
    await createGatewayAuthMiddleware(jwt, config)(request, response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
    expect(request.headers['x-user-id']).toBeUndefined();
    expect(request.headers['x-internal-service-secret']).toBeUndefined();
    gatewayAuthorizationMiddleware(request, response, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('permits authenticated dashboard users to reach project routes for project-level authorization', () => {
    const request = {
      method: 'GET',
      originalUrl: '/api/projects',
      headers: { 'x-user-role': 'OPERATOR' },
    } as unknown as Request;
    const next = jest.fn() as NextFunction;
    gatewayAuthorizationMiddleware(request, response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
