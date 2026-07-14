import { randomUUID } from 'node:crypto';

import { Alert } from '../../domain/entities/alert.entity';
import type { AlertRepository } from '../../domain/repositories/alert.repository';
import { ProcessAlertEventUseCase } from './process-alert-event.use-case';

describe('ProcessAlertEventUseCase', () => {
  let alertRepository: jest.Mocked<AlertRepository>;
  let useCase: ProcessAlertEventUseCase;

  beforeEach(() => {
    alertRepository = {
      create: jest.fn(),
      findActiveByRuleId: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };

    useCase = new ProcessAlertEventUseCase(alertRepository);
  });

  it('should create a TRIGGERED alert from an exceeded event', async () => {
    alertRepository.findActiveByRuleId.mockResolvedValue(null);

    alertRepository.create.mockImplementation((alert) =>
      Promise.resolve(alert),
    );

    const result = await useCase.execute({
      eventType: 'METRIC_THRESHOLD_EXCEEDED',
      ruleId: 'rule-1',
      assetId: 'asset-1',
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 90,
      occurredAt: '2026-07-14T10:00:00.000Z',
      message: 'CPU usage exceeded threshold',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(alertRepository.findActiveByRuleId).toHaveBeenCalledWith('rule-1');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(alertRepository.create).toHaveBeenCalledTimes(1);
    expect(result?.toObject().status).toBe('TRIGGERED');
  });

  it('should not create a duplicate active alert', async () => {
    const existingAlert = Alert.create(randomUUID(), {
      ruleId: 'rule-1',
      assetId: 'asset-1',
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 90,
      message: 'CPU usage exceeded threshold',
      triggeredAt: new Date('2026-07-14T10:00:00.000Z'),
    });

    alertRepository.findActiveByRuleId.mockResolvedValue(existingAlert);

    const result = await useCase.execute({
      eventType: 'METRIC_THRESHOLD_EXCEEDED',
      ruleId: 'rule-1',
      assetId: 'asset-1',
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 95,
      occurredAt: '2026-07-14T10:05:00.000Z',
      message: 'CPU usage exceeded threshold',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(alertRepository.create).not.toHaveBeenCalled();
    expect(result).toBe(existingAlert);
  });

  it('should resolve an active alert from a recovered event', async () => {
    const existingAlert = Alert.create(randomUUID(), {
      ruleId: 'rule-1',
      assetId: 'asset-1',
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 90,
      message: 'CPU usage exceeded threshold',
      triggeredAt: new Date('2026-07-14T10:00:00.000Z'),
    });

    alertRepository.findActiveByRuleId.mockResolvedValue(existingAlert);
    alertRepository.update.mockImplementation((alert) =>
      Promise.resolve(alert),
    );

    const result = await useCase.execute({
      eventType: 'METRIC_THRESHOLD_RECOVERED',
      ruleId: 'rule-1',
      assetId: 'asset-1',
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 40,
      occurredAt: '2026-07-14T10:10:00.000Z',
      message: 'CPU usage recovered',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(alertRepository.update).toHaveBeenCalledTimes(1);
    expect(result?.toObject().status).toBe('RESOLVED');
    expect(result?.toObject().actualValue).toBe(40);
  });

  it('should ignore a recovered event when no active alert exists', async () => {
    alertRepository.findActiveByRuleId.mockResolvedValue(null);

    const result = await useCase.execute({
      eventType: 'METRIC_THRESHOLD_RECOVERED',
      ruleId: 'rule-1',
      assetId: 'asset-1',
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 40,
      occurredAt: '2026-07-14T10:10:00.000Z',
      message: 'CPU usage recovered',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(alertRepository.update).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
