import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AlertProps } from '../../domain/entities/alert.entity';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/repositories/alert.repository';

@Injectable()
export class CloseAlertUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,
  ) {}

  async execute(alertId: string): Promise<AlertProps> {
    const alert = await this.alertRepository.findById(alertId);

    if (!alert) {
      throw new NotFoundException(`Alert with id ${alertId} was not found`);
    }

    try {
      alert.close();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to close alert';

      throw new BadRequestException(message);
    }

    const updatedAlert = await this.alertRepository.update(alert);

    return updatedAlert.toObject();
  }
}
