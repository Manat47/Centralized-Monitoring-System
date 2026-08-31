import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { Alert } from '../../domain/entities/alert.entity';
import type { AlertRepository } from '../../domain/repositories/alert.repository';
import { QueryAssetAlertImpactUseCase } from './query-asset-alert-impact.use-case';

function createAlert(alertId: string): Alert {
  return Alert.create(alertId, {
    sourceType: 'METRIC_RULE',
    sourceId: 'rule-1',
    assetId: 'asset-1',
    metricType: 'CPU_USAGE',
    severity: 'WARNING',
    message: 'CPU threshold exceeded',
    triggeredAt: new Date('2026-08-30T00:00:00.000Z'),
  });
}

describe('QueryAssetAlertImpactUseCase', () => {
  const repository = {
    findActiveByAssetId: jest.fn(),
  } as unknown as jest.Mocked<AlertRepository>;
  const useCase = new QueryAssetAlertImpactUseCase(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('separates triggered and acknowledged active alerts', async () => {
    const triggered = createAlert('alert-1');
    const acknowledged = createAlert('alert-2');
    acknowledged.acknowledge('user-1');
    repository.findActiveByAssetId.mockResolvedValue([triggered, acknowledged]);

    await expect(useCase.execute('asset-1')).resolves.toEqual({
      triggered: 1,
      acknowledged: 1,
      total: 2,
    });
  });
});
