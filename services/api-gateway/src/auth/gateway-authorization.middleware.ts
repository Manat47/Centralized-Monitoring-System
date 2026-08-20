import type { NextFunction, Request, Response } from 'express';

type UserRole = 'ADMIN' | 'OPERATOR';

const PUBLIC_ROUTES = new Set([
  'POST /api/auth/login',
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  '/api/metrics',
]);

function getRequestPath(request: Request): string {
  return request.originalUrl.split('?')[0];
}

function getRequestKey(request: Request): string {
  return `${request.method.toUpperCase()} ${getRequestPath(request)}`;
}

function getUserRole(request: Request): UserRole | null {
  const role = request.headers['x-user-role'];

  if (role === 'ADMIN' || role === 'OPERATOR') {
    return role;
  }

  return null;
}

function isPublicRoute(method: string, path: string): boolean {
  if (method === 'GET' && path === '/api/metrics') {
    return true;
  }
  return PUBLIC_ROUTES.has(`${method} ${path}`);
}

function isSharedRoute(method: string, path: string): boolean {
  if (method === 'GET' && path === '/api/auth/me') {
    return true;
  }

  if (
    method === 'GET' &&
    (path === '/api/dashboard' || path.startsWith('/api/dashboard/'))
  ) {
    return true;
  }

  if (
    method === 'GET' &&
    (path === '/api/system/status' || path.startsWith('/api/system/status/'))
  ) {
    return true;
  }

  if (
    method === 'GET' &&
    (path === '/api/alerts' || path.startsWith('/api/alerts/'))
  ) {
    return true;
  }

  if (
    method === 'PATCH' &&
    /^\/api\/alerts\/[^/]+\/(acknowledge|close)$/.test(path)
  ) {
    return true;
  }

  if (
    method === 'GET' &&
    (path === '/api/assets' || path.startsWith('/api/assets/'))
  ) {
    return true;
  }

  if (
    method === 'GET' &&
    (path === '/api/monitoring-targets' ||
      path.startsWith('/api/monitoring-targets/'))
  ) {
    return true;
  }

  if (
    method === 'GET' &&
    (path === '/api/metric-rules' || path.startsWith('/api/metric-rules/'))
  ) {
    return true;
  }

  if (
    method === 'GET' &&
    (path === '/api/health-check-targets' ||
      path.startsWith('/api/health-check-targets/'))
  ) {
    return true;
  }

  if (
    method === 'GET' &&
    (path === '/api/reports' || path.startsWith('/api/reports/'))
  ) {
    return true;
  }

  return false;
}

function isAdminRoute(method: string, path: string): boolean {
  if (path === '/api/users' || path.startsWith('/api/users/')) {
    return true;
  }

  if (
    method !== 'GET' &&
    (path === '/api/assets' || path.startsWith('/api/assets/'))
  ) {
    return true;
  }

  if (
    method !== 'GET' &&
    (path === '/api/monitoring-targets' ||
      path.startsWith('/api/monitoring-targets/'))
  ) {
    return true;
  }

  if (
    method !== 'GET' &&
    (path === '/api/metric-rules' || path.startsWith('/api/metric-rules/'))
  ) {
    return true;
  }

  if (
    method === 'GET' &&
    (path === '/api/audit-logs' || path.startsWith('/api/audit-logs/'))
  ) {
    return true;
  }

  if (
    method !== 'GET' &&
    (path === '/api/health-check-targets' ||
      path.startsWith('/api/health-check-targets/'))
  ) {
    return true;
  }

  if (method === 'POST' && path === '/api/reports/generate') {
    return true;
  }

  if (
    path === '/api/notification-recipients' ||
    path.startsWith('/api/notification-recipients/')
  ) {
    return true;
  }

  return false;
}

export function gatewayAuthorizationMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const method = request.method.toUpperCase();
  const path = getRequestPath(request);

  if (method === 'OPTIONS') {
    next();
    return;
  }

  if (isPublicRoute(method, path)) {
    next();
    return;
  }

  const role = getUserRole(request);

  if (!role) {
    response.status(401).json({
      statusCode: 401,
      message: 'Authenticated user role is required',
      error: 'Unauthorized',
    });

    return;
  }

  if (isSharedRoute(method, path)) {
    next();
    return;
  }

  if (isAdminRoute(method, path)) {
    if (role === 'ADMIN') {
      next();
      return;
    }

    response.status(403).json({
      statusCode: 403,
      message: 'Administrator role is required',
      error: 'Forbidden',
    });

    return;
  }

  response.status(403).json({
    statusCode: 403,
    message: `Access to ${getRequestKey(request)} is not permitted`,
    error: 'Forbidden',
  });
}
