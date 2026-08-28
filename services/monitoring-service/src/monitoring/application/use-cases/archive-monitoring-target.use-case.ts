import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
  type UserRole,
} from '../../domain/ports/audit-event-publisher.port';
import {
  ASSET_READER,
  type AssetReader,
} from '../../domain/ports/asset-reader.port';
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';
import { MonitoringTargetMetricLifecycleService } from '../services/monitoring-target-metric-lifecycle.service';

export interface ArchiveMonitoringTargetInput {
  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;
}

@Injectable()
export class ArchiveMonitoringTargetUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,
    private readonly metricLifecycle: MonitoringTargetMetricLifecycleService,
  ) {}

  async execute(
    targetId: string,
    input: ArchiveMonitoringTargetInput,
  ): Promise<MonitoringTarget> {
    const target = await this.monitoringTargetRepository.findById(targetId);

    if (!target) {
      throw new NotFoundException(
        `Monitoring target with ID ${targetId} not found`,
      );
    }

    try {
      target.archive();
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Monitoring target cannot be archived',
      );
    }

    const archivedTarget = await this.monitoringTargetRepository.update(target);
    const data = archivedTarget.toObject();
    const affectedRuleCount = await this.metricLifecycle.transition(
      archivedTarget,
      'ARCHIVED',
    );
    const asset = await this.assetReader.findById(data.assetId);

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: 'MONITORING_TARGET_ARCHIVED',
      resourceType: 'MONITORING_TARGET',
      resourceId: targetId,
      resourceName: asset ? `${asset.name} monitoring target` : null,
      result: 'SUCCESS',
      metadata: {
        assetId: data.assetId,
        monitoringType: data.monitoringType,
        affectedEnabledMetricRules: affectedRuleCount,
      },
      occurredAt: data.updatedAt,
    });

    return archivedTarget;
  }
}
