import { Inject, Injectable, NotFoundException } from '@nestjs/common';

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

export interface DisableMonitoringInput {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
  actorEmail?: string | null;
}

@Injectable()
export class DisableMonitoringUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,

    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,

    @Inject(ASSET_READER)
    private readonly assetReader: AssetReader,
  ) {}

  async execute(
    targetId: string,
    input: DisableMonitoringInput,
  ): Promise<MonitoringTarget> {
    const target = await this.monitoringTargetRepository.findById(targetId);

    if (!target) {
      throw new NotFoundException(
        `Monitoring target with ID ${targetId} not found`,
      );
    }

    target.disableMonitoring();

    const updatedTarget = await this.monitoringTargetRepository.update(target);
    const data = updatedTarget.toObject();
    const asset = await this.assetReader.findById(data.assetId);

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,

      action: 'MONITORING_TARGET_DISABLED',

      resourceType: 'MONITORING_TARGET',
      resourceId: targetId,
      resourceName: asset ? `${asset.name} monitoring target` : null,

      result: 'SUCCESS',
      metadata: {
        assetId: data.assetId,
        monitoringEnabled: false,
      },

      occurredAt: new Date(),
    });

    return updatedTarget;
  }
}
