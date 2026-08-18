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

export interface AcknowledgeAlertInput {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
}

@Injectable()
export class AcknowledgeAlertUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(
    alertId: string,
    input: AcknowledgeAlertInput,
  ): Promise<AlertProps> {
    const alert = await this.alertRepository.findById(alertId);

    if (!alert) {
      throw new NotFoundException(`Alert with id ${alertId} was not found`);
    }

    try {
      alert.acknowledge();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to acknowledge alert';

      throw new BadRequestException(message);
    }

    const updatedAlert = await this.alertRepository.update(alert);

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: 'ALERT_ACKNOWLEDGED',
      resourceType: 'ALERT',
      resourceId: alertId,
      result: 'SUCCESS',
      occurredAt: new Date(),
    });

    return updatedAlert.toObject();
  }
}
