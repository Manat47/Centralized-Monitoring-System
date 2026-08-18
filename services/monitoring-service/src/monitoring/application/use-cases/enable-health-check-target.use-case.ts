import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  HEALTH_CHECK_TARGET_REPOSITORY,
  type HealthCheckTargetRepository,
} from '../../domain/repositories/health-check-target.repository';

import { HealthCheckTarget } from '../../domain/entities/health-check-target.entity';

import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';

export interface EnableHealthCheckTargetInput {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
}

@Injectable()
export class EnableHealthCheckTargetUseCase {
  constructor(
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly healthCheckTargetRepository: HealthCheckTargetRepository,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(
    healthCheckTargetId: string,
    input: EnableHealthCheckTargetInput,
  ): Promise<HealthCheckTarget> {
    const target =
      await this.healthCheckTargetRepository.findById(healthCheckTargetId);

    if (!target) {
      throw new NotFoundException(
        `Health check target with ID ${healthCheckTargetId} not found`,
      );
    }

    target.enable();

    const updatedTarget = await this.healthCheckTargetRepository.update(target);

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,

      action: 'HEALTH_CHECK_TARGET_ENABLED',

      resourceType: 'HEALTH_CHECK_TARGET',
      resourceId: healthCheckTargetId,

      result: 'SUCCESS',

      occurredAt: new Date(),
    });

    return updatedTarget;
  }
}
