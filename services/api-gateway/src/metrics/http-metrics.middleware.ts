import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { NextFunction, Request, Response } from 'express';
import type { Counter } from 'prom-client';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsTotal: Counter<string>,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const path = request.originalUrl.split('?')[0];

    if (path === '/api/metrics' || request.method === 'OPTIONS') {
      next();
      return;
    }

    response.on('finish', () => {
      this.httpRequestsTotal.inc({
        method: request.method,
        status_code: String(response.statusCode),
      });
    });

    next();
  }
}
