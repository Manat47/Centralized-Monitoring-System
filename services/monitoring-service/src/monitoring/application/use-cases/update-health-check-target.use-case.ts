import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  HEALTH_CHECK_TARGET_REPOSITORY,
  type HealthCheckTargetRepository,
} from '../../domain/repositories/health-check-target.repository';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
  type UserRole,
} from '../../domain/ports/audit-event-publisher.port';
import {
  getAuditSafeHealthCheckUrl,
  type HealthCheckTarget,
} from '../../domain/entities/health-check-target.entity';
import {
  ALERT_EVENT_PUBLISHER,
  type AlertEventPublisher,
} from '../../domain/ports/alert-event-publisher.port';

export interface UpdateHealthCheckTargetInput {
  checkIntervalSeconds: number;
  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;
}

@Injectable()
export class UpdateHealthCheckTargetUseCase {
  constructor(
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly repository: HealthCheckTargetRepository,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
    @Inject(ALERT_EVENT_PUBLISHER)
    private readonly alertEventPublisher: AlertEventPublisher,
  ) {}

  async execute(
    healthCheckTargetId: string,
    input: UpdateHealthCheckTargetInput,
  ): Promise<HealthCheckTarget> {
    const target = await this.repository.findById(healthCheckTargetId);

    if (!target) {
      throw new NotFoundException(
        `Health check target with ID ${healthCheckTargetId} not found`,
      );
    }

    if (target.toObject().archivedAt) {
      throw new BadRequestException('Archived health check cannot be updated');
    }

    const previousData = target.toObject();
    target.updateInterval(input.checkIntervalSeconds);

    const updatedTarget = await this.repository.update(target);

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: 'HEALTH_CHECK_TARGET_UPDATED',
      resourceType: 'HEALTH_CHECK_TARGET',
      resourceId: healthCheckTargetId,
      resourceName: getAuditSafeHealthCheckUrl(previousData.url),
      result: 'SUCCESS',
      metadata: {
        assetId: previousData.assetId,
        changes: {
          checkIntervalSeconds: {
            before: previousData.checkIntervalSeconds,
            after: input.checkIntervalSeconds,
          },
        },
      },
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
      state: updatedData.enabled ? 'RUNNING' : 'PAUSED',
      occurredAt: updatedData.updatedAt,
    });

    return updatedTarget;
  }
}
