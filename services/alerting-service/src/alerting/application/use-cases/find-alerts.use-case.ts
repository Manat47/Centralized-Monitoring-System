import { Inject, Injectable } from '@nestjs/common';

import type { AlertProps } from '../../domain/entities/alert.entity';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/repositories/alert.repository';

@Injectable()
export class FindAlertsUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,
  ) {}

  async execute(): Promise<AlertProps[]> {
    const alerts = await this.alertRepository.findAll();

    return alerts.map((alert) => alert.toObject());
  }
}
