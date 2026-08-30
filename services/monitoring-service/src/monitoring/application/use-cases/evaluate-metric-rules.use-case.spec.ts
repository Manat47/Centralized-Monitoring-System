import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import {
  MetricRule,
  MetricRuleSeverity,
  MetricRuleType,
} from '../../domain/entities/metric-rule.entity';
import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import type { AlertEventPublisher } from '../../domain/ports/alert-event-publisher.port';
import type { AssetReader } from '../../domain/ports/asset-reader.port';
import type { MetricRuleEvaluationStateRepository } from '../../domain/repositories/metric-rule-evaluation-state.repository';
import type { MetricRuleRepository } from '../../domain/repositories/metric-rule.repository';
import type { MonitoringTargetRepository } from '../../domain/repositories/monitoring-target.repository';
import type { MetricsSummaryResult } from './query-metrics-summary.use-case';
import { QueryMetricsSummaryUseCase } from './query-metrics-summary.use-case';
import { EvaluateMetricRulesUseCase } from './evaluate-metric-rules.use-case';

const assetId = '85ffffba-fdf7-464e-aad5-1b4a3b82110a';

function cpuSummary(sampleAt: Date, value: number): MetricsSummaryResult {
  return {
    assetId,
    timestamp: sampleAt,
    cpu: {
      averageUsagePercent: value,
      cores: [{ timestamp: sampleAt, cpu: '0', usagePercent: value }],
    },
    memory: null,
    disks: [],
    networks: [],
  };
}

function noDataSummary(): MetricsSummaryResult {
  return {
    assetId,
    timestamp: null,
    cpu: { averageUsagePercent: null, cores: [] },
    memory: null,
    disks: [],
    networks: [],
  };
}

describe('EvaluateMetricRulesUseCase sample-aware duration', () => {
  const rule = MetricRule.create('rule-1', {
    assetId,
    metricType: MetricRuleType.CPU_USAGE,
    thresholdValue: 50,
    durationSeconds: 30,
    severity: MetricRuleSeverity.WARNING,
  });
  const target = MonitoringTarget.restore({
    targetId: 'target-1',
    assetId,
    monitoringType: 'NODE_EXPORTER',
    protocol: 'HTTP',
    port: 9100,
    path: '/metrics',
    scrapeIntervalSeconds: 15,
    verificationStatus: 'VERIFIED',
    verifiedConfigFingerprint: 'fingerprint',
    monitoringEnabled: true,
    archivedAt: null,
    lastVerifiedAt: new Date('2026-08-25T10:00:00.000Z'),
    lastAttemptedAt: new Date('2026-08-25T10:00:00.000Z'),
    lastCollectedAt: new Date('2026-08-25T10:00:00.000Z'),
    lastError: null,
    createdAt: new Date('2026-08-25T09:00:00.000Z'),
    updatedAt: new Date('2026-08-25T10:00:00.000Z'),
  });

  const ruleRepository = {
    findEnabled: jest.fn(),
  } as unknown as jest.Mocked<MetricRuleRepository>;
  const updateState = jest.fn<MetricRuleEvaluationStateRepository['update']>();
  const stateRepository = {
    findByRuleId: jest.fn(),
    create: jest.fn(),
    update: updateState,
  } as unknown as jest.Mocked<MetricRuleEvaluationStateRepository>;
  const publishAlertEvent = jest.fn<AlertEventPublisher['publish']>();
  const alertEventPublisher = {
    publish: publishAlertEvent,
  } as unknown as jest.Mocked<AlertEventPublisher>;
  const assetReader = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<AssetReader>;
  const queryMetricsSummaryUseCase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<QueryMetricsSummaryUseCase>;
  const monitoringTargetRepository = {
    findByAssetIdAndMonitoringType: jest.fn(),
  } as unknown as jest.Mocked<MonitoringTargetRepository>;

  const useCase = new EvaluateMetricRulesUseCase(
    ruleRepository,
    stateRepository,
    alertEventPublisher,
    assetReader,
    queryMetricsSummaryUseCase,
    monitoringTargetRepository,
  );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    let storedState: Parameters<typeof stateRepository.create>[0] | null = null;
    ruleRepository.findEnabled.mockResolvedValue([rule]);
    stateRepository.findByRuleId.mockImplementation(() =>
      Promise.resolve(storedState),
    );
    stateRepository.create.mockImplementation((state) => {
      storedState = state;
      return Promise.resolve(state);
    });
    updateState.mockImplementation((state) => {
      storedState = state;
      return Promise.resolve(state);
    });
    assetReader.findById.mockResolvedValue({
      assetId,
      name: 'server-01',
      assetType: 'SERVER',
      ipAddress: '10.0.0.1',
      hostname: 'server-01.local',
      endpoint: null,
      status: 'ACTIVATE',
    });
    monitoringTargetRepository.findByAssetIdAndMonitoringType.mockResolvedValue(
      target,
    );
    publishAlertEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not advance duration when the evaluator sees the same sample again', async () => {
    const sampleAt = new Date('2026-08-25T10:00:00.000Z');
    queryMetricsSummaryUseCase.execute.mockResolvedValue(
      cpuSummary(sampleAt, 80),
    );

    jest.setSystemTime(sampleAt);
    await useCase.execute();

    jest.setSystemTime(new Date('2026-08-25T10:00:35.000Z'));
    const result = await useCase.execute();

    expect(result.triggered).toBe(0);
    expect(publishAlertEvent).not.toHaveBeenCalled();
    expect(updateState).toHaveBeenCalledTimes(1);
  });

  it('triggers only after distinct violating samples span the configured duration', async () => {
    const firstSampleAt = new Date('2026-08-25T10:00:00.000Z');
    const secondSampleAt = new Date('2026-08-25T10:00:15.000Z');
    const thirdSampleAt = new Date('2026-08-25T10:00:30.000Z');

    for (const sampleAt of [firstSampleAt, secondSampleAt, thirdSampleAt]) {
      jest.setSystemTime(sampleAt);
      queryMetricsSummaryUseCase.execute.mockResolvedValue(
        cpuSummary(sampleAt, 80),
      );
      await useCase.execute();
    }

    expect(publishAlertEvent).toHaveBeenCalledTimes(1);
    expect(publishAlertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'METRIC_THRESHOLD_EXCEEDED',
        actualValue: 80,
      }),
    );
  });

  it('starts a fresh pending duration after a no-data gap', async () => {
    const firstSampleAt = new Date('2026-08-25T10:00:00.000Z');
    jest.setSystemTime(firstSampleAt);
    queryMetricsSummaryUseCase.execute.mockResolvedValue(
      cpuSummary(firstSampleAt, 80),
    );
    await useCase.execute();

    jest.setSystemTime(new Date('2026-08-25T10:01:00.000Z'));
    queryMetricsSummaryUseCase.execute.mockResolvedValue(noDataSummary());
    await useCase.execute();

    const resumedSampleAt = new Date('2026-08-25T10:01:15.000Z');
    jest.setSystemTime(resumedSampleAt);
    queryMetricsSummaryUseCase.execute.mockResolvedValue(
      cpuSummary(resumedSampleAt, 80),
    );
    const result = await useCase.execute();

    expect(result.triggered).toBe(0);
    expect(publishAlertEvent).not.toHaveBeenCalled();
    expect(updateState.mock.calls.at(-1)?.[0].toObject()).toMatchObject({
      status: 'VIOLATING',
      violatedSince: resumedSampleAt,
      lastSampleAt: resumedSampleAt,
    });
  });
});
