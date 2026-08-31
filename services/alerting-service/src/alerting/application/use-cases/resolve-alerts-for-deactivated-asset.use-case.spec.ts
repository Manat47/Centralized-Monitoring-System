import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { Alert } from '../../domain/entities/alert.entity';
import type { AlertRepository } from '../../domain/repositories/alert.repository';
import { ProcessAlertEventUseCase } from './process-alert-event.use-case';
import { ResolveAlertsForDeactivatedAssetUseCase } from './resolve-alerts-for-deactivated-asset.use-case';

function createAlert(alertId: string): Alert {
  return Alert.create(alertId, {
    sourceType: 'METRIC_RULE',
    sourceId: `rule-${alertId}`,
    assetId: 'asset-1',
    metricType: 'CPU_USAGE',
    severity: 'WARNING',
    message: 'CPU threshold exceeded',
    triggeredAt: new Date('2026-08-30T00:00:00.000Z'),
  });
}

describe('ResolveAlertsForDeactivatedAssetUseCase', () => {
  const repository = {
    findActiveByAssetId: jest.fn(),
  } as unknown as jest.Mocked<AlertRepository>;
  const resolveAlert = jest.fn<ProcessAlertEventUseCase['resolveAlert']>();
  const processAlertEventUseCase = {
    resolveAlert,
  } as unknown as jest.Mocked<ProcessAlertEventUseCase>;
  const useCase = new ResolveAlertsForDeactivatedAssetUseCase(
    repository,
    processAlertEventUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves every triggered or acknowledged alert without deleting history', async () => {
    const triggered = createAlert('alert-1');
    const acknowledged = createAlert('alert-2');
    acknowledged.acknowledge('user-1');
    repository.findActiveByAssetId.mockResolvedValue([triggered, acknowledged]);
    resolveAlert.mockImplementation((alert) => Promise.resolve(alert));

    await expect(
      useCase.execute({
        eventType: 'ASSET_DEACTIVATED',
        assetId: 'asset-1',
        occurredAt: '2026-08-30T01:00:00.000Z',
      }),
    ).resolves.toBe(2);

    expect(resolveAlert).toHaveBeenCalledTimes(2);
    expect(resolveAlert).toHaveBeenCalledWith(
      triggered,
      null,
      new Date('2026-08-30T01:00:00.000Z'),
      'ASSET_DEACTIVATED',
      'Alert resolved because the asset was deactivated',
    );
  });
});
