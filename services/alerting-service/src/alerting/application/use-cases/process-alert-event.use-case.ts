import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { Alert } from '../../domain/entities/alert.entity';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/repositories/alert.repository';
import type { AlertEvent } from '../contracts/alert-event';

@Injectable()
export class ProcessAlertEventUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,
  ) {}

  async execute(event: AlertEvent): Promise<Alert | null> {
    if (event.eventType === 'METRIC_THRESHOLD_EXCEEDED') {
      const existingAlert = await this.alertRepository.findActiveByRuleId(
        event.ruleId,
      );

      if (existingAlert) {
        return existingAlert;
      }

      const alert = Alert.create(randomUUID(), {
        ruleId: event.ruleId,
        assetId: event.assetId,
        metricType: event.metricType,
        severity: event.severity,
        thresholdValue: event.thresholdValue,
        actualValue: event.actualValue,
        message: event.message,
        triggeredAt: new Date(event.occurredAt),
      });

      return this.alertRepository.create(alert);
    }

    const activeAlert = await this.alertRepository.findActiveByRuleId(
      event.ruleId,
    );

    if (!activeAlert) {
      return null;
    }

    activeAlert.resolve(event.actualValue, new Date(event.occurredAt));

    return this.alertRepository.update(activeAlert);
  }
}
