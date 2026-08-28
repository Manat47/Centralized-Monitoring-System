import {
  MetricRule,
  MetricRuleSeverity,
  MetricRuleType,
} from '../../domain/entities/metric-rule.entity';
import { MetricRuleEvaluationState } from '../../domain/entities/metric-rule-evaluation-state.entity';
import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import type { AlertEventPublisher } from '../../domain/ports/alert-event-publisher.port';
import type { MetricRuleEvaluationStateRepository } from '../../domain/repositories/metric-rule-evaluation-state.repository';
import type { MetricRuleRepository } from '../../domain/repositories/metric-rule.repository';
import { MonitoringTargetMetricLifecycleService } from './monitoring-target-metric-lifecycle.service';

describe('MonitoringTargetMetricLifecycleService', () => {
  it('moves enabled rule evaluations to no data when collection pauses', async () => {
    const target = MonitoringTarget.create('target-001', {
      assetId: 'asset-001',
      monitoringType: 'NODE_EXPORTER',
    });
    const rule = MetricRule.create('rule-001', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      thresholdValue: 80,
      severity: MetricRuleSeverity.WARNING,
    });
    const evaluation = MetricRuleEvaluationState.create('state-001', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });
    evaluation.markViolating(
      new Date('2026-08-28T10:00:00.000Z'),
      new Date('2026-08-28T10:00:00.000Z'),
      90,
    );

    const metricRuleRepository = {
      findByAssetId: jest
        .fn()
        .mockResolvedValue([
          { rule: rule.toObject(), evaluation: evaluation.toObject() },
        ]),
    } as unknown as jest.Mocked<MetricRuleRepository>;
    const stateRepository = {
      findByRuleId: jest.fn().mockResolvedValue(evaluation),
      update: jest.fn().mockImplementation((state) => Promise.resolve(state)),
    } as unknown as jest.Mocked<MetricRuleEvaluationStateRepository>;
    const alertEventPublisher = {
      publish: jest.fn(),
    } as jest.Mocked<AlertEventPublisher>;
    const service = new MonitoringTargetMetricLifecycleService(
      metricRuleRepository,
      stateRepository,
      alertEventPublisher,
    );

    const affected = await service.transition(target, 'PAUSED');

    expect(affected).toBe(1);
    expect(evaluation.toObject()).toMatchObject({
      status: 'NORMAL',
      violatedSince: null,
      lastSampleAt: null,
      lastActualValue: null,
    });
    expect(evaluation.toObject().lastEvaluatedAt).toBeInstanceOf(Date);
    expect(alertEventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'MONITORING_TARGET_STATE_CHANGED',
        monitoringTargetId: 'target-001',
        assetId: 'asset-001',
        state: 'PAUSED',
      }),
    );
  });

  it('creates a no-data evaluation for an enabled rule without state', async () => {
    const target = MonitoringTarget.create('target-002', {
      assetId: 'asset-002',
      monitoringType: 'NODE_EXPORTER',
    });
    const rule = MetricRule.create('rule-002', {
      assetId: 'asset-002',
      metricType: MetricRuleType.MEMORY_USAGE,
      thresholdValue: 85,
      severity: MetricRuleSeverity.CRITICAL,
    });
    const metricRuleRepository = {
      findByAssetId: jest
        .fn()
        .mockResolvedValue([{ rule: rule.toObject(), evaluation: null }]),
    } as unknown as jest.Mocked<MetricRuleRepository>;
    const stateRepository = {
      findByRuleId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((state) => Promise.resolve(state)),
    } as unknown as jest.Mocked<MetricRuleEvaluationStateRepository>;
    const alertEventPublisher = {
      publish: jest.fn(),
    } as jest.Mocked<AlertEventPublisher>;
    const service = new MonitoringTargetMetricLifecycleService(
      metricRuleRepository,
      stateRepository,
      alertEventPublisher,
    );

    await service.transition(target, 'ARCHIVED');

    expect(stateRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({}),
    );
    const createdState = stateRepository.create.mock.calls[0][0].toObject();
    expect(createdState).toMatchObject({
      ruleId: 'rule-002',
      assetId: 'asset-002',
      status: 'NORMAL',
      lastActualValue: null,
    });
    expect(createdState.lastEvaluatedAt).toBeInstanceOf(Date);
  });
});
