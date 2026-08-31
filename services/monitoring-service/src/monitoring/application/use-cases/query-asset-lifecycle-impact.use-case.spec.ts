import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { HealthCheckTarget } from '../../domain/entities/health-check-target.entity';
import {
  MetricRule,
  MetricRuleSeverity,
  MetricRuleType,
} from '../../domain/entities/metric-rule.entity';
import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import type { HealthCheckTargetRepository } from '../../domain/repositories/health-check-target.repository';
import type { MetricRuleRepository } from '../../domain/repositories/metric-rule.repository';
import type { MonitoringTargetRepository } from '../../domain/repositories/monitoring-target.repository';
import { QueryAssetLifecycleImpactUseCase } from './query-asset-lifecycle-impact.use-case';

describe('QueryAssetLifecycleImpactUseCase', () => {
  const monitoringRepository = {
    findAllByAssetId: jest.fn(),
  } as unknown as jest.Mocked<MonitoringTargetRepository>;
  const healthRepository = {
    findAllByAssetId: jest.fn(),
  } as unknown as jest.Mocked<HealthCheckTargetRepository>;
  const ruleRepository = {
    findByAssetId: jest.fn(),
  } as unknown as jest.Mocked<MetricRuleRepository>;
  const useCase = new QueryAssetLifecycleImpactUseCase(
    monitoringRepository,
    healthRepository,
    ruleRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts configured and enabled non-archived resources for one asset', async () => {
    const monitoringTarget = MonitoringTarget.create('target-1', {
      assetId: 'asset-1',
      monitoringType: 'NODE_EXPORTER',
    });
    monitoringTarget.markVerified('fingerprint');
    monitoringTarget.enableMonitoring();

    const healthTarget = HealthCheckTarget.create('health-1', {
      assetId: 'asset-1',
      url: 'https://example.com/health',
    });
    const archivedHealthTarget = HealthCheckTarget.create('health-2', {
      assetId: 'asset-1',
      url: 'https://example.com/ready',
    });
    archivedHealthTarget.archive();

    const rule = MetricRule.create('rule-1', {
      assetId: 'asset-1',
      metricType: MetricRuleType.CPU_USAGE,
      thresholdValue: 80,
      durationSeconds: 60,
      severity: MetricRuleSeverity.WARNING,
    });

    monitoringRepository.findAllByAssetId.mockResolvedValue([monitoringTarget]);
    healthRepository.findAllByAssetId.mockResolvedValue([
      healthTarget,
      archivedHealthTarget,
    ]);
    ruleRepository.findByAssetId.mockResolvedValue([
      { rule: rule.toObject(), evaluation: null },
    ]);

    await expect(useCase.execute('asset-1')).resolves.toEqual({
      monitoringTargets: { configured: 1, enabled: 1 },
      healthChecks: { configured: 1, enabled: 1 },
      metricRules: { configured: 1, enabled: 1 },
    });
  });
});
