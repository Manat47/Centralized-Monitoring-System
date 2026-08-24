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
  HEALTH_CHECKER,
  type HealthChecker,
  type HealthCheckResult,
} from '../../domain/ports/health-checker.port';
import {
  HEALTH_CHECK_STORAGE,
  type HealthCheckStorage,
} from '../../domain/ports/health-check-storage.port';
import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port';

import { AssetNotOperationalException } from '../errors/asset-not-operational.exception';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
  type UserRole,
} from '../../domain/ports/audit-event-publisher.port';

export interface CheckHealthTargetInput {
  actorUserId: string;
  actorRole: UserRole;
}

@Injectable()
export class CheckHealthTargetUseCase {
  constructor(
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly healthCheckTargetRepository: HealthCheckTargetRepository,

    @Inject(HEALTH_CHECKER)
    private readonly healthChecker: HealthChecker,

    @Inject(HEALTH_CHECK_STORAGE)
    private readonly healthCheckStorage: HealthCheckStorage,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(
    healthCheckTargetId: string,
    input?: CheckHealthTargetInput,
  ): Promise<HealthCheckResult> {
    const target =
      await this.healthCheckTargetRepository.findById(healthCheckTargetId);

    if (!target) {
      throw new NotFoundException(
        `Health check target with ID ${healthCheckTargetId} not found`,
      );
    }

    const data = target.toObject();

    if (data.archivedAt) {
      throw new BadRequestException('Archived health check cannot be run');
    }

    const asset = await this.assetReader.findById(data.assetId);

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${data.assetId} not found`);
    }

    if (asset.status !== 'ACTIVATE') {
      throw new AssetNotOperationalException(asset.assetId, asset.status);
    }

    if (asset.assetType !== 'APPLICATION') {
      throw new BadRequestException(
        'Health checks can only run for application assets',
      );
    }

    const result = await this.healthChecker.check(data.url);

    await this.healthCheckStorage.writeResult({
      healthCheckTargetId: data.healthCheckTargetId,
      assetId: data.assetId,
      result,
    });

    target.markChecked(result.checkedAt);

    await this.healthCheckTargetRepository.update(target);

    if (input) {
      await this.auditEventPublisher.publish({
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        action: 'HEALTH_CHECK_TARGET_CHECKED',
        resourceType: 'HEALTH_CHECK_TARGET',
        resourceId: healthCheckTargetId,
        result: 'SUCCESS',
        occurredAt: new Date(),
      });
    }

    return result;
  }
}
