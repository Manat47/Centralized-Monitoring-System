import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  MonitoringTarget,
  type CreateMonitoringTargetProps,
} from '../../domain/entities/monitoring-target.entity';
import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';

@Injectable()
export class CreateMonitoringTargetUseCase {
  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,
  ) {}

  async execute(input: CreateMonitoringTargetProps): Promise<MonitoringTarget> {
    const existingTarget = await this.monitoringTargetRepository.findByAssetId(
      input.assetId,
    );

    if (existingTarget) {
      throw new ConflictException(
        `Monitoring target for asset ${input.assetId} already exists`,
      );
    }

    const target = MonitoringTarget.create(randomUUID(), input);

    return this.monitoringTargetRepository.create(target);
  }
}
