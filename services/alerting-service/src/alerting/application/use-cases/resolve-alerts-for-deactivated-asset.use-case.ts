import { Inject, Injectable } from '@nestjs/common';

import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/repositories/alert.repository';

import type { AssetLifecycleEvent } from '../contracts/asset-lifecycle-event';
import { ProcessAlertEventUseCase } from './process-alert-event.use-case';

@Injectable()
export class ResolveAlertsForDeactivatedAssetUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,

    private readonly processAlertEventUseCase: ProcessAlertEventUseCase,
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
