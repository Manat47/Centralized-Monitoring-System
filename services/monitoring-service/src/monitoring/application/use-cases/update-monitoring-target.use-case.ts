import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  MonitoringAddressSource,
  MonitoringTarget,
} from '../../domain/entities/monitoring-target.entity';
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

export interface UpdateMonitoringTargetInput {
  addressSource: MonitoringAddressSource;
  actorUserId: string;
  actorRole: UserRole;
  actorEmail?: string | null;
}

@Injectable()
export class UpdateMonitoringTargetUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly repository: MonitoringTargetRepository,
    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
    private readonly metricLifecycle: MonitoringTargetMetricLifecycleService,
  ) {}

  async execute(
    targetId: string,
    input: UpdateMonitoringTargetInput,
  ): Promise<MonitoringTarget> {
    const target = await this.repository.findById(targetId);

    if (!target) {
      throw new NotFoundException(
        `Monitoring target with ID ${targetId} not found`,
      );
    }

    const previousData = target.toObject();

    if (previousData.archivedAt) {
      throw new BadRequestException(
        'Archived monitoring target cannot be updated',
      );
    }

    if (previousData.monitoringType !== 'NODE_EXPORTER') {
      throw new BadRequestException(
        'Address source is only supported for SERVER monitoring targets',
      );
    }

    const asset = await this.assetReader.findById(previousData.assetId);

    if (!asset) {
      throw new NotFoundException(
        `Asset with ID ${previousData.assetId} not found`,
      );
    }

    if (asset.status === 'DEACTIVATE') {
      throw new BadRequestException(
        'Deactivated asset monitoring target cannot be updated',
      );
    }

    if (input.addressSource === 'HOSTNAME' && !asset.hostname?.trim()) {
      throw new BadRequestException(
        'Selected hostname is not configured on the SERVER asset',
      );
    }

    if (input.addressSource === 'IP_ADDRESS' && !asset.ipAddress?.trim()) {
      throw new BadRequestException(
        'Selected IP address is not configured on the SERVER asset',
      );
    }

    if (previousData.addressSource === input.addressSource) {
      return target;
    }

    target.changeAddressSource(input.addressSource);
    const updatedTarget = await this.repository.update(target);
    const affectedRuleCount = previousData.monitoringEnabled
      ? await this.metricLifecycle.transition(updatedTarget, 'PAUSED')
      : 0;
    const updatedData = updatedTarget.toObject();

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: 'MONITORING_TARGET_UPDATED',
      resourceType: 'MONITORING_TARGET',
      resourceId: targetId,
      resourceName: `${asset.name} monitoring target`,
      result: 'SUCCESS',
      metadata: {
        assetId: updatedData.assetId,
        changes: {
          addressSource: {
            before: previousData.addressSource,
            after: updatedData.addressSource,
          },
        },
        verificationInvalidated: true,
        monitoringPaused: previousData.monitoringEnabled,
        affectedEnabledMetricRules: affectedRuleCount,
      },
      occurredAt: updatedData.updatedAt,
    });

    return updatedTarget;
  }
}
