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

@Injectable()
export class VerifyMonitoringTargetUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,

    @Inject(METRICS_COLLECTOR_RESOLVER)
    private readonly metricsCollectorResolver: MetricsCollectorResolver,
  ) {}

  async execute(targetId: string): Promise<MonitoringTarget> {
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

    return this.monitoringTargetRepository.update(target);
  }
}
