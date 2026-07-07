import { Inject, Injectable } from '@nestjs/common';

import { MonitoringTarget } from '../../domain/entities/monitoring-target.entity';
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';

@Injectable()
export class FindMonitoringTargetsUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,
  ) {}

  async execute(): Promise<MonitoringTarget[]> {
    return this.monitoringTargetRepository.findAll();
  }
}
