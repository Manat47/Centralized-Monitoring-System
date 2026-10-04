import { describe, expect, it, jest } from '@jest/globals';

import { HealthCheckTarget } from '../../domain/entities/health-check-target.entity';
import type { HealthCheckTargetRepository } from '../../domain/repositories/health-check-target.repository';
import { QueryHealthCheckHistoryUseCase } from './query-health-check-history.use-case';
import { QueryHealthReportSummaryUseCase } from './query-health-report-summary.use-case';

describe('QueryHealthReportSummaryUseCase', () => {
  it('counts only the configured expected HTTP status as successful', async () => {
    const target = HealthCheckTarget.create('target-1', {
      name: 'Async job',
      expectedStatus: 202,
      url: 'https://example.com/status',
    });
    const history = {
      execute: jest
        .fn<QueryHealthCheckHistoryUseCase['execute']>()
        .mockResolvedValue([
          {
            timestamp: new Date(),
            statusCode: 202,
            responseTimeMs: 10,
            error: null,
          },
          {
            timestamp: new Date(),
            statusCode: 200,
            responseTimeMs: 12,
            error: null,
          },
        ]),
    } as unknown as QueryHealthCheckHistoryUseCase;
    const repository = {
      findById: jest
        .fn<HealthCheckTargetRepository['findById']>()
        .mockResolvedValue(target),
    } as unknown as HealthCheckTargetRepository;
    const useCase = new QueryHealthReportSummaryUseCase(history, repository);

    const result = await useCase.execute({
      healthCheckTargetId: 'target-1',
      start: new Date('2026-10-01T00:00:00Z'),
      end: new Date('2026-10-01T01:00:00Z'),
    });

    expect(result.successfulChecks).toBe(1);
    expect(result.failedHttpChecks).toBe(1);
    expect(result.availabilityPercent).toBe(50);
  });
});
