import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  HealthCheckTarget,
  type CreateHealthCheckTargetProps,
  normalizeHealthCheckUrl,
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

    if (asset.status === 'DEACTIVATE') {
      throw new BadRequestException(
        'Deactivated asset cannot be configured for health checks',
      );
    }

    if (asset.assetType !== 'APPLICATION') {
      throw new BadRequestException(
        'Health checks can only be configured for application assets',
      );
    }

    const normalizedUrl = normalizeHealthCheckUrl(input.url);

    const existingTarget =
      await this.healthCheckTargetRepository.findActiveByAssetIdAndUrl(
        asset.assetId,
        normalizedUrl,
      );

    if (existingTarget) {
      throw new ConflictException(
        'An active health check already exists for this application and URL',
      );
    }

    const createProps: CreateHealthCheckTargetProps = {
      assetId: asset.assetId,
      url: normalizedUrl,
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
