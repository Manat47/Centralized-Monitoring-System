import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import {
  METRICS_COLLECTOR,
  type MetricsCollector,
} from '../../domain/ports/metrics-collector.port';
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';

@Injectable()
export class VerifyMonitoringTargetUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,

    @Inject(METRICS_COLLECTOR)
    private readonly metricsCollector: MetricsCollector,
  ) {}

  async execute(targetId: string): Promise<MonitoringTarget> {
    const target = await this.monitoringTargetRepository.findById(targetId);

    if (!target) {
      throw new NotFoundException(
        `Monitoring target with ID ${targetId} not found`,
      );
    }

    const result = await this.metricsCollector.verify(target.getScrapeUrl());

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
