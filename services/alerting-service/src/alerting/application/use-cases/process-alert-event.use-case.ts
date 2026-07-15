import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { Alert } from '../../domain/entities/alert.entity';
import {
  NOTIFICATION_EVENT_PUBLISHER,
  type NotificationEventPublisher,
} from '../../domain/port/notification-event-publisher.port';
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

    @Inject(NOTIFICATION_EVENT_PUBLISHER)
    private readonly notificationEventPublisher: NotificationEventPublisher,
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

      const createdAlert = await this.alertRepository.create(alert);
      const data = createdAlert.toObject();

      await this.notificationEventPublisher.publish({
        eventType: 'ALERT_RESOLVED',
        alertId: data.alertId,
        ruleId: data.ruleId,
        assetId: data.assetId,
        metricType: data.metricType,
        severity: data.severity,
        message: event.message,
        occurredAt: data.resolvedAt?.toISOString() ?? event.occurredAt,
      });
      return createdAlert;
    }

    const activeAlert = await this.alertRepository.findActiveByRuleId(
      event.ruleId,
    );

    if (!activeAlert) {
      return null;
    }

    activeAlert.resolve(event.actualValue, new Date(event.occurredAt));

    const updatedAlert = await this.alertRepository.update(activeAlert);

    const data = updatedAlert.toObject();

    await this.notificationEventPublisher.publish({
      eventType: 'ALERT_RESOLVED',
      alertId: data.alertId,
      ruleId: data.ruleId,
      assetId: data.assetId,
      metricType: data.metricType,
      severity: data.severity,
      message: data.message,
      occurredAt: data.resolvedAt?.toISOString() ?? event.occurredAt,
    });

    return updatedAlert;
  }
}
