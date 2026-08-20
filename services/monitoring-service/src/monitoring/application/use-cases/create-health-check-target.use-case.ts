import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  HealthCheckTarget,
  type CreateHealthCheckTargetProps,
} from '../../domain/entities/health-check-target.entity';

import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port';

import {
  HEALTH_CHECK_TARGET_REPOSITORY,
  type HealthCheckTargetRepository,
} from '../../domain/repositories/health-check-target.repository';

import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';

export interface CreateHealthCheckTargetInput {
  assetId: string;
  url: string;
  checkIntervalSeconds?: number;

  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
}

@Injectable()
export class CreateHealthCheckTargetUseCase {
  constructor(
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly healthCheckTargetRepository: HealthCheckTargetRepository,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(
    input: CreateHealthCheckTargetInput,
  ): Promise<HealthCheckTarget> {
    const asset = await this.assetReader.findById(input.assetId);

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${input.assetId} not found`);
    }

    if (asset.status !== 'ACTIVATE') {
      throw new BadRequestException(
        `Asset status must be ACTIVATE, current status is ${asset.status}`,
      );
    }

    const createProps: CreateHealthCheckTargetProps = {
      assetId: asset.assetId,
      url: input.url,
      checkIntervalSeconds: input.checkIntervalSeconds,
    };

    const healthCheckTargetId = randomUUID();

    const target = HealthCheckTarget.create(healthCheckTargetId, createProps);

    const createdTarget = await this.healthCheckTargetRepository.create(target);

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,

      action: 'HEALTH_CHECK_TARGET_CREATED',

      resourceType: 'HEALTH_CHECK_TARGET',
      resourceId: healthCheckTargetId,

      result: 'SUCCESS',

      occurredAt: new Date(),
    });

    return createdTarget;
  }
}
