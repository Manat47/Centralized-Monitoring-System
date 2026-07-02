import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  MONITORING_TARGET_REPOSITORY,
  type MonitoringTargetRepository,
} from '../../domain/repositories/monitoring-target.repository';
import { CollectTargetMetricsUseCase } from './collect-target-metrics.use-case';

export interface CollectEnabledTargetsResult {
  checked: number;
  collected: number;
  skipped: number;
  failed: number;
}

@Injectable()
export class CollectEnabledTargetsUseCase {
  private readonly logger = new Logger(CollectEnabledTargetsUseCase.name);

  constructor(
    @Inject(MONITORING_TARGET_REPOSITORY)
    private readonly monitoringTargetRepository: MonitoringTargetRepository,

    private readonly collectTargetMetricsUseCase: CollectTargetMetricsUseCase,
  ) {}

  async execute(): Promise<CollectEnabledTargetsResult> {
    const targets = await this.monitoringTargetRepository.findEnabled();

    const result: CollectEnabledTargetsResult = {
      checked: targets.length,
      collected: 0,
      skipped: 0,
      failed: 0,
    };

    const now = new Date();

    for (const target of targets) {
      const data = target.toObject();

      if (!this.isDueForCollection(data, now)) {
        result.skipped += 1;
        continue;
      }

      try {
        await this.collectTargetMetricsUseCase.execute(data.targetId);

        result.collected += 1;
      } catch (error) {
        result.failed += 1;

        const message =
          error instanceof Error ? error.message : 'Unknown collection error';

        this.logger.error(
          `Failed to collect target ${data.targetId}: ${message}`,
        );
      }
    }

    return result;
  }

  private isDueForCollection(
    target: {
      lastCollectedAt: Date | null;
      scrapeIntervalSeconds: number;
    },
    now: Date,
  ): boolean {
    if (!target.lastCollectedAt) {
      return true;
    }

    const elapsedMilliseconds =
      now.getTime() - target.lastCollectedAt.getTime();

    const scrapeIntervalMilliseconds = target.scrapeIntervalSeconds * 1000;

    return elapsedMilliseconds >= scrapeIntervalMilliseconds;
  }
}
