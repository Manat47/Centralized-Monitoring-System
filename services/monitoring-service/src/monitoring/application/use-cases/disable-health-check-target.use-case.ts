import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  HEALTH_CHECK_TARGET_REPOSITORY,
  type HealthCheckTargetRepository,
} from '../../domain/repositories/health-check-target.repository';

import { HealthCheckTarget } from '../../domain/entities/health-check-target.entity';

import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';
import { randomUUID } from 'node:crypto';
import {
  ALERT_EVENT_PUBLISHER,
  type AlertEventPublisher,
} from '../../domain/ports/alert-event-publisher.port';

export interface DisableHealthCheckTargetInput {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
}

@Injectable()
export class DisableHealthCheckTargetUseCase {
  constructor(
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly healthCheckTargetRepository: HealthCheckTargetRepository,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,

    @Inject(ALERT_EVENT_PUBLISHER)
    private readonly alertEventPublisher: AlertEventPublisher,
  ) {}

  async execute(
    healthCheckTargetId: string,
    input: DisableHealthCheckTargetInput,
  ): Promise<HealthCheckTarget> {
    const target =
      await this.healthCheckTargetRepository.findById(healthCheckTargetId);

    if (!target) {
      throw new NotFoundException(
        `Health check target with ID ${healthCheckTargetId} not found`,
      );
    }

    if (target.toObject().archivedAt) {
      throw new BadRequestException('Archived health check cannot be paused');
    }

    target.disable();

    const updatedTarget = await this.healthCheckTargetRepository.update(target);

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,

      action: 'HEALTH_CHECK_TARGET_DISABLED',

      resourceType: 'HEALTH_CHECK_TARGET',
      resourceId: healthCheckTargetId,

      result: 'SUCCESS',

      occurredAt: new Date(),
    });

    const updatedData = updatedTarget.toObject();
    await this.alertEventPublisher.publish({
      eventId: randomUUID(),
      eventType: 'HEALTH_CHECK_TARGET_STATE_CHANGED',
      healthCheckTargetId,
      assetId: updatedData.assetId,
      url: updatedData.url,
      checkIntervalSeconds: updatedData.checkIntervalSeconds,
      state: 'PAUSED',
      occurredAt: updatedData.updatedAt,
    });

    return updatedTarget;
  }
}
