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
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/port/audit-event-publisher.port';

export interface CloseAlertInput {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
}

@Injectable()
export class CloseAlertUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(alertId: string, input: CloseAlertInput): Promise<AlertProps> {
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

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: 'ALERT_CLOSED',
      resourceType: 'ALERT',
      resourceId: alertId,
      result: 'SUCCESS',
      occurredAt: new Date(),
    });

    return updatedAlert.toObject();
  }
}
