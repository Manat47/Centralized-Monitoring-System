import { HealthCheckAlertState } from '../../domain/entities/health-check-alert-state.entity';
import type { HealthCheckAlertStateRepository } from '../../domain/repositories/health-check-alert-state.repository';
import type { AlertRepository } from '../../domain/repositories/alert.repository';
import { ProcessAlertEventUseCase } from './process-alert-event.use-case';
import { EvaluateStaleHealthChecksUseCase } from './evaluate-stale-health-checks.use-case';

describe('EvaluateStaleHealthChecksUseCase', () => {
  it('does not alert during the first 60 seconds after target creation', async () => {
    const now = new Date('2026-10-02T01:00:00.000Z');
    const state = HealthCheckAlertState.restore({
      ...HealthCheckAlertState.create({
        healthCheckTargetId: 'target-1',
        assetId: 'asset-1',
        url: 'https://example.com/health',
        checkIntervalSeconds: 30,
      }).toObject(),
      createdAt: new Date(now.getTime() - 30_000),
      lastResultAt: new Date(now.getTime() - 120_000),
    });
    const markStaleIfCurrent = jest.fn();
    const createAlert = jest.fn();
    const stateRepository = {
      findStaleCandidates: jest.fn().mockResolvedValue([state]),
      findByTargetId: jest.fn().mockResolvedValue(state),
      markStaleIfCurrent,
    } as unknown as HealthCheckAlertStateRepository;
    const alertRepository = {
      findActiveBySource: jest.fn(),
    } as unknown as AlertRepository;
    const processAlertEvent = {
      createAlert,
      resolveAlert: jest.fn(),
    } as unknown as ProcessAlertEventUseCase;
    const useCase = new EvaluateStaleHealthChecksUseCase(
      stateRepository,
      alertRepository,
      processAlertEvent,
    );

    expect(await useCase.execute(now)).toBe(0);
    expect(markStaleIfCurrent).not.toHaveBeenCalled();
    expect(createAlert).not.toHaveBeenCalled();
  });
});
