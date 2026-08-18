import { Inject, Injectable, NotFoundException } from '@nestjs/common';

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

export interface VerifyMonitoringTargetInput {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
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

    const collector = this.metricsCollectorResolver.resolve(
      target.getMonitoringType(),
    );

    const result = await collector.verify(target.getScrapeUrl());

    if (result.success) {
      target.markVerified();
    } else {
      target.markVerificationFailed(
        result.errorMessage ?? 'Verification failed',
      );
    }

    const updatedTarget = await this.monitoringTargetRepository.update(target);

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,

      action: 'MONITORING_TARGET_VERIFIED',

      resourceType: 'MONITORING_TARGET',
      resourceId: targetId,

      result: result.success ? 'SUCCESS' : 'FAILURE',

      occurredAt: new Date(),
    });

    return updatedTarget;
  }
}
