import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import {
  METRICS_COLLECTOR_RESOLVER,
  type MetricsCollectorResolver,
} from '../../domain/ports/metrics-collector-resolver.port';
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';
import { MonitoringEndpointResolver } from '../services/monitoring-endpoint-resolver.service';
import { MonitoringConfigFingerprintService } from '../services/monitoring-config-fingerprint.service';
import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port';

export interface VerifyMonitoringTargetInput {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
  actorEmail?: string | null;
}

@Injectable()
export class VerifyMonitoringTargetUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,

    @Inject(METRICS_COLLECTOR_RESOLVER)
    private readonly metricsCollectorResolver: MetricsCollectorResolver,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,

    private readonly monitoringEndpointResolver: MonitoringEndpointResolver,
    private readonly monitoringConfigFingerprintService: MonitoringConfigFingerprintService,
  ) {}

  async execute(
    targetId: string,
    input: VerifyMonitoringTargetInput,
  ): Promise<MonitoringTarget> {
    const target = await this.monitoringTargetRepository.findById(targetId);

    if (!target) {
      throw new NotFoundException(
        `Monitoring target with ID ${targetId} not found`,
      );
    }

    if (target.toObject().archivedAt) {
      throw new BadRequestException(
        'Archived monitoring target cannot be verified',
      );
    }

    const collector = this.metricsCollectorResolver.resolve(
      target.getMonitoringType(),
    );

    const scrapeUrl = await this.monitoringEndpointResolver.resolve(target, {
      requireOperational: true,
    });

    const result = await collector.verify(scrapeUrl);

    if (result.success) {
      const fingerprint = this.monitoringConfigFingerprintService.create(
        target,
        scrapeUrl,
      );
      target.markVerified(fingerprint);
    } else {
      target.markVerificationFailed(
        result.errorMessage ?? 'Verification failed',
      );
    }

    const updatedTarget = await this.monitoringTargetRepository.update(target);
    const data = updatedTarget.toObject();
    const asset = await this.assetReader.findById(data.assetId);

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,

      action: 'MONITORING_TARGET_VERIFIED',

      resourceType: 'MONITORING_TARGET',
      resourceId: targetId,
      resourceName: asset ? `${asset.name} monitoring target` : null,

      result: result.success ? 'SUCCESS' : 'FAILURE',
      metadata: {
        assetId: data.assetId,
        monitoringType: data.monitoringType,
        protocol: data.protocol,
        port: data.port,
        path: data.path,
        verificationStatus: data.verificationStatus,
      },
      errorCode: result.success ? null : 'MONITORING_VERIFICATION_FAILED',
      errorMessage: result.success ? null : result.errorMessage,

      occurredAt: new Date(),
    });

    return updatedTarget;
  }
}
