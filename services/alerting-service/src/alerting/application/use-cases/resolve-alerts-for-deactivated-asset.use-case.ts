import { Inject, Injectable } from '@nestjs/common';

import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/repositories/alert.repository';

import {
  NOTIFICATION_EVENT_PUBLISHER,
  type NotificationEventPublisher,
} from '../../domain/port/notification-event-publisher.port';

import type { AssetLifecycleEvent } from '../contracts/asset-lifecycle-event';

@Injectable()
export class ResolveAlertsForDeactivatedAssetUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,

    @Inject(NOTIFICATION_EVENT_PUBLISHER)
    private readonly notificationEventPublisher: NotificationEventPublisher,
  ) {}

  async execute(event: AssetLifecycleEvent): Promise<number> {
    const activeAlerts = await this.alertRepository.findActiveByAssetId(
      event.assetId,
    );

    if (activeAlerts.length === 0) {
      return 0;
    }

    const resolvedAt = new Date(event.occurredAt);

    for (const alert of activeAlerts) {
      alert.resolve(null, resolvedAt, 'ASSET_DEACTIVATED');

      const updatedAlert = await this.alertRepository.update(alert);

      const data = updatedAlert.toObject();

      await this.notificationEventPublisher.publish({
        eventType: 'ALERT_RESOLVED',
        alertId: data.alertId,
        ruleId: data.ruleId,
        assetId: data.assetId,
        metricType: data.metricType,
        severity: data.severity,
        message: 'Alert resolved because the asset was deactivated',
        occurredAt: resolvedAt.toISOString(),

        resolutionReason: 'ASSET_DEACTIVATED',
      });
    }

    return activeAlerts.length;
  }
}
