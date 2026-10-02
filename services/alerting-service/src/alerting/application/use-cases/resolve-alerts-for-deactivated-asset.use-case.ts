import { Inject, Injectable } from '@nestjs/common';

import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/repositories/alert.repository';
import {
  HEALTH_CHECK_ALERT_STATE_REPOSITORY,
  type HealthCheckAlertStateRepository,
} from '../../domain/repositories/health-check-alert-state.repository';

import type { AssetLifecycleEvent } from '../contracts/asset-lifecycle-event';
import { ProcessAlertEventUseCase } from './process-alert-event.use-case';

@Injectable()
export class ResolveAlertsForDeactivatedAssetUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,

    @Inject(HEALTH_CHECK_ALERT_STATE_REPOSITORY)
    private readonly healthStateRepository: HealthCheckAlertStateRepository,

    private readonly processAlertEventUseCase: ProcessAlertEventUseCase,
  ) {}

  async execute(event: AssetLifecycleEvent): Promise<number> {
    const resolvedAt = new Date(event.occurredAt);
    await this.healthStateRepository.disableByAssetId(
      event.assetId,
      resolvedAt,
    );

    const activeAlerts = await this.alertRepository.findActiveByAssetId(
      event.assetId,
    );

    if (activeAlerts.length === 0) {
      return 0;
    }

    for (const alert of activeAlerts) {
      await this.processAlertEventUseCase.resolveAlert(
        alert,
        null,
        resolvedAt,
        'ASSET_DEACTIVATED',
        'Alert resolved because the asset was deactivated',
      );
    }

    return activeAlerts.length;
  }
}
