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

export interface EnableMonitoringInput {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
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

    const asset = await this.assetReader.findById(targetData.assetId);

    if (!asset) {
      throw new NotFoundException(
        `Asset with ID ${targetData.assetId} not found`,
      );
    }

    if (asset.status === 'DEACTIVATE') {
      throw new BadRequestException(
        'Monitoring cannot be configured for a deactivated asset',
      );
    }

    target.enableMonitoring();

    const updatedTarget = await this.monitoringTargetRepository.update(target);

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,

      action: 'MONITORING_TARGET_ENABLED',

      resourceType: 'MONITORING_TARGET',
      resourceId: targetId,

      result: 'SUCCESS',

      occurredAt: new Date(),
    });

    return updatedTarget;
  }
}
