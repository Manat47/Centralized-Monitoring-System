import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { AlertProps } from '../../domain/entities/alert.entity';
import type { AlertLifecycleEvent } from '../../domain/entities/alert-lifecycle-event';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/repositories/alert.repository';

@Injectable()
export class FindAlertByIdUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,
  ) {}

  async execute(
    alertId: string,
  ): Promise<AlertProps & { lifecycle: AlertLifecycleEvent[] }> {
    const alert = await this.alertRepository.findById(alertId);

    if (!alert) {
      throw new NotFoundException(`Alert with id ${alertId} was not found`);
    }

    const lifecycle =
      await this.alertRepository.findLifecycleEvents(alertId);

    return { ...alert.toObject(), lifecycle };
  }
}
