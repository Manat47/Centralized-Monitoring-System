import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';
import { createGatewayAuthMiddleware } from './gateway-auth.middleware';
import { createGatewayIngestRateLimit } from './gateway-auth.middleware';
import type Redis from 'ioredis';
import { gatewayAuthorizationMiddleware } from './gateway-authorization.middleware';

describe('log routes at the gateway', () => {
  const response = {} as Response;

  it('passes the ingestion token without treating it as a user JWT and strips spoofed headers', async () => {
    const verifyAsync = jest.fn();
    const jwt = { verifyAsync } as unknown as JwtService;
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
    expect(verifyAsync).not.toHaveBeenCalled();
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

  it('allows operators to view finding rules but reserves rule changes for administrators', () => {
    const next = jest.fn() as NextFunction;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const operator = { headers: { 'x-user-role': 'OPERATOR' } };
    gatewayAuthorizationMiddleware(
      {
        ...operator,
        method: 'GET',
        originalUrl: '/api/log-finding-rules',
      } as unknown as Request,
      { status } as unknown as Response,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    gatewayAuthorizationMiddleware(
      {
        ...operator,
        method: 'POST',
        originalUrl: '/api/log-finding-rules',
      } as unknown as Request,
      { status } as unknown as Response,
      next,
    );
    expect(status).toHaveBeenCalledWith(403);
    gatewayAuthorizationMiddleware(
      {
        method: 'PATCH',
        originalUrl: '/api/log-finding-rules/rule-id',
        headers: { 'x-user-role': 'ADMIN' },
      } as unknown as Request,
      { status } as unknown as Response,
      next,
    );
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('rejects ingestion at the gateway before proxying when the rolling limit is reached', async () => {
    const evaluate = jest.fn((...args: unknown[]) => {
      void args;
      return Promise.resolve(0);
    });
    const redis = { eval: evaluate } as unknown as Redis;
    const request = {
      method: 'POST',
      originalUrl: '/api/ingest/logs',
      headers: { authorization: 'Bearer prj_live_test' },
      socket: { remoteAddress: '203.0.113.10' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn() as NextFunction;
    await createGatewayIngestRateLimit(redis)(
      request,
      { status } as unknown as Response,
      next,
    );
    expect(status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
    const call = evaluate.mock.calls[0];
    expect(call[1]).toBe(2);
    expect(JSON.stringify(call)).not.toContain('prj_live_test');
  });

  it('fails closed for ingestion when the shared limiter is unavailable', async () => {
    const redis = {
      eval: jest.fn().mockRejectedValue(new Error('offline')),
    } as unknown as Redis;
    const request = {
      method: 'POST',
      originalUrl: '/api/ingest/logs',
      headers: {},
      socket: { remoteAddress: '203.0.113.10' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn() as NextFunction;
    await createGatewayIngestRateLimit(redis)(
      request,
      { status } as unknown as Response,
      next,
    );
    expect(status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes an allowed ingest request to the proxy', async () => {
    const evaluate = jest.fn().mockResolvedValue(1);
    const redis = { eval: evaluate } as unknown as Redis;
    const request = {
      method: 'POST',
      originalUrl: '/api/ingest/logs',
      headers: {},
      socket: { remoteAddress: '203.0.113.10' },
    } as unknown as Request;
    const next = jest.fn() as NextFunction;
    await createGatewayIngestRateLimit(redis)(request, response, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(evaluate).toHaveBeenCalledTimes(1);
  });

  it('passes a project-token receipt lookup through both gateway guards', async () => {
    const verifyAsync = jest.fn();
    const jwt = { verifyAsync } as unknown as JwtService;
    const config = { get: jest.fn() } as unknown as ConfigService;
    const request = {
      method: 'GET',
      originalUrl:
        '/api/ingest/logs/receipts/123e4567-e89b-12d3-a456-426614174000',
      headers: { authorization: 'Bearer prj_live_test' },
    } as unknown as Request;
    const next = jest.fn() as NextFunction;
    await createGatewayAuthMiddleware(jwt, config)(request, response, next);
    gatewayAuthorizationMiddleware(request, response, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(verifyAsync).not.toHaveBeenCalled();
  });
});
