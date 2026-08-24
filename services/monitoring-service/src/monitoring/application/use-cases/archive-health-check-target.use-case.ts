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
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
  type UserRole,
} from '../../domain/ports/audit-event-publisher.port';
import type { HealthCheckTarget } from '../../domain/entities/health-check-target.entity';

export interface ArchiveHealthCheckTargetInput {
  actorUserId: string;
  actorRole: UserRole;
}

@Injectable()
export class ArchiveHealthCheckTargetUseCase {
  constructor(
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly repository: HealthCheckTargetRepository,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(
    healthCheckTargetId: string,
    input: ArchiveHealthCheckTargetInput,
  ): Promise<HealthCheckTarget> {
    const target = await this.repository.findById(healthCheckTargetId);

    if (!target) {
      throw new NotFoundException(
        `Health check target with ID ${healthCheckTargetId} not found`,
      );
    }

    if (target.toObject().archivedAt) {
      throw new BadRequestException('Health check is already archived');
    }

    target.archive();

    const archivedTarget = await this.repository.update(target);

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: 'HEALTH_CHECK_TARGET_ARCHIVED',
      resourceType: 'HEALTH_CHECK_TARGET',
      resourceId: healthCheckTargetId,
      result: 'SUCCESS',
      occurredAt: new Date(),
    });

    return archivedTarget;
  }
}
