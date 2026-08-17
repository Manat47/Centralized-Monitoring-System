import { Injectable } from '@nestjs/common';

import type {
  HealthChecker,
  HealthCheckResult,
} from '../../domain/ports/health-checker.port';

@Injectable()
export class HttpHealthChecker implements HealthChecker {
  async check(url: string): Promise<HealthCheckResult> {
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const responseTimeMs = Date.now() - startedAt;

      return {
        statusCode: response.status,
        responseTimeMs,
        checkedAt: new Date(),
        error: null,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startedAt;

      return {
        statusCode: null,
        responseTimeMs,
        checkedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
