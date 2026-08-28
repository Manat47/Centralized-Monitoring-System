import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';
import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port';
import { MonitoringEndpointResolver } from '../services/monitoring-endpoint-resolver.service';
import { MonitoringConfigFingerprintService } from '../services/monitoring-config-fingerprint.service';
import { MonitoringVerificationRequiredException } from '../errors/monitoring-verification-required.exception';
import { MonitoringTargetMetricLifecycleService } from '../services/monitoring-target-metric-lifecycle.service';

export interface EnableMonitoringInput {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
  actorEmail?: string | null;
}

@Injectable()
export class EnableMonitoringUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,

    private readonly monitoringEndpointResolver: MonitoringEndpointResolver,

    private readonly monitoringConfigFingerprintService: MonitoringConfigFingerprintService,

    private readonly metricLifecycle: MonitoringTargetMetricLifecycleService,
  ) {}

  async execute(
    targetId: string,
    input: EnableMonitoringInput,
  ): Promise<MonitoringTarget> {
    const target = await this.monitoringTargetRepository.findById(targetId);

    if (!target) {
      throw new NotFoundException(
        `Monitoring target with ID ${targetId} not found`,
      );
    }

    const targetData = target.toObject();

    if (targetData.archivedAt) {
      throw new BadRequestException(
        'Archived monitoring target cannot be enabled',
      );
    }

    const asset = await this.assetReader.findById(targetData.assetId);

    if (!asset) {
      throw new NotFoundException(
        `Asset with ID ${targetData.assetId} not found`,
      );
    }

    // DEACTIVATE = read-only
    if (asset.status === 'DEACTIVATE') {
      throw new BadRequestException(
        'Monitoring cannot be configured for a deactivated asset',
      );
    }

    // ยังไม่เคย verify หรือ verification เก่าใช้ไม่ได้แล้ว
    if (
      targetData.verificationStatus !== 'VERIFIED' ||
      !targetData.verifiedConfigFingerprint
    ) {
      throw new MonitoringVerificationRequiredException();
    }

    // INACTIVATE ยังมาถึงตรงนี้ได้
    // เพราะอนุญาตให้ตั้ง config enabled ไว้ล่วงหน้า
    const scrapeUrl = await this.monitoringEndpointResolver.resolve(target);

    const currentFingerprint = this.monitoringConfigFingerprintService.create(
      target,
      scrapeUrl,
    );

    if (targetData.verifiedConfigFingerprint !== currentFingerprint) {
      target.invalidateVerification();

      await this.monitoringTargetRepository.update(target);

      throw new MonitoringVerificationRequiredException(
        'Monitoring configuration has changed and must be verified again',
      );
    }

    target.enableMonitoring();

    const updatedTarget = await this.monitoringTargetRepository.update(target);

    const affectedRuleCount = await this.metricLifecycle.transition(
      updatedTarget,
      'RUNNING',
    );

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,

      action: 'MONITORING_TARGET_ENABLED',

      resourceType: 'MONITORING_TARGET',
      resourceId: targetId,
      resourceName: `${asset.name} monitoring target`,

      result: 'SUCCESS',
      metadata: {
        assetId: targetData.assetId,
        monitoringEnabled: true,
        affectedEnabledMetricRules: affectedRuleCount,
      },

      occurredAt: new Date(),
    });

    return updatedTarget;
  }
}
