import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
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

import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port';
import { randomUUID } from 'node:crypto';
import {
  ALERT_EVENT_PUBLISHER,
  type AlertEventPublisher,
} from '../../domain/ports/alert-event-publisher.port';

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

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,

    @Inject(ALERT_EVENT_PUBLISHER)
    private readonly alertEventPublisher: AlertEventPublisher,
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

    const data = target.toObject();

    if (data.archivedAt) {
      throw new BadRequestException('Archived health check cannot be resumed');
    }

    const asset = await this.assetReader.findById(data.assetId);

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${data.assetId} not found`);
    }

    if (asset.status === 'DEACTIVATE') {
      throw new BadRequestException(
        'Health check cannot be configured for a deactivated asset',
      );
    }

    if (asset.assetType !== 'APPLICATION') {
      throw new BadRequestException(
        'Health checks can only run for application assets',
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

    const updatedData = updatedTarget.toObject();
    await this.alertEventPublisher.publish({
      eventId: randomUUID(),
      eventType: 'HEALTH_CHECK_TARGET_STATE_CHANGED',
      healthCheckTargetId,
      assetId: updatedData.assetId,
      url: updatedData.url,
      checkIntervalSeconds: updatedData.checkIntervalSeconds,
      state: 'RUNNING',
      occurredAt: updatedData.updatedAt,
    });

    return updatedTarget;
  }
}
