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
import { getAuditSafeHealthCheckUrl } from '../../domain/entities/health-check-target.entity';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
  type UserRole,
} from '../../domain/ports/audit-event-publisher.port';
import {
  ALERT_EVENT_PUBLISHER,
  type AlertEventPublisher,
} from '../../domain/ports/alert-event-publisher.port';

export interface CheckHealthTargetInput {
  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;
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

    @Inject(ALERT_EVENT_PUBLISHER)
    private readonly alertEventPublisher: AlertEventPublisher,
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

    if (!input) {
      await this.alertEventPublisher.publish({
        eventId: randomUUID(),
        eventType: 'HEALTH_CHECK_RESULT_RECORDED',
        healthCheckTargetId: data.healthCheckTargetId,
        assetId: data.assetId,
        url: data.url,
        checkIntervalSeconds: data.checkIntervalSeconds,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        error: result.error,
        occurredAt: result.checkedAt,
      });
    }

    if (input) {
      await this.auditEventPublisher.publish({
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        actorEmail: input.actorEmail,
        action: 'HEALTH_CHECK_TARGET_CHECKED',
        resourceType: 'HEALTH_CHECK_TARGET',
        resourceId: healthCheckTargetId,
        resourceName: `${asset.name} health check`,
        result: 'SUCCESS',
        metadata: {
          assetId: data.assetId,
          url: getAuditSafeHealthCheckUrl(data.url),
          statusCode: result.statusCode,
          responseTimeMs: result.responseTimeMs,
          available:
            result.statusCode !== null &&
            result.statusCode >= 200 &&
            result.statusCode < 300,
          error: result.error,
        },
        occurredAt: new Date(),
      });
    }

    return result;
  }
}
