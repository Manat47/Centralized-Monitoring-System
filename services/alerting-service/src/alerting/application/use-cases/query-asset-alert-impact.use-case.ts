import { Inject, Injectable } from '@nestjs/common';

import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/repositories/alert.repository';

export interface AssetAlertImpact {
  triggered: number;
  acknowledged: number;
  total: number;
}

@Injectable()
export class QueryAssetAlertImpactUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,
  ) {}

  async execute(assetId: string): Promise<AssetAlertImpact> {
    const alerts = await this.alertRepository.findActiveByAssetId(assetId);
    const triggered = alerts.filter(
      (alert) => alert.toObject().status === 'TRIGGERED',
    ).length;
    const acknowledged = alerts.filter(
      (alert) => alert.toObject().status === 'ACKNOWLEDGED',
    ).length;

    return {
      triggered,
      acknowledged,
      total: triggered + acknowledged,
    };
  }
}
