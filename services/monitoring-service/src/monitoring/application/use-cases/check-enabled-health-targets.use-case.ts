import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  HEALTH_CHECK_TARGET_REPOSITORY,
  type HealthCheckTargetRepository,
} from '../../domain/repositories/health-check-target.repository';
import { CheckHealthTargetUseCase } from './check-health-target.use-case';
import { AssetNotOperationalException } from '../errors/asset-not-operational.exception';

export interface CheckEnabledHealthTargetsResult {
  checked: number;
  performed: number;
  skipped: number;
  failed: number;
}

@Injectable()
export class CheckEnabledHealthTargetsUseCase {
  private readonly logger = new Logger(CheckEnabledHealthTargetsUseCase.name);

  constructor(
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly healthCheckTargetRepository: HealthCheckTargetRepository,
    private readonly checkHealthTargetUseCase: CheckHealthTargetUseCase,
  ) {}

  async execute(): Promise<CheckEnabledHealthTargetsResult> {
    const targets = await this.healthCheckTargetRepository.findEnabled();

    const result: CheckEnabledHealthTargetsResult = {
      checked: targets.length,
      performed: 0,
      skipped: 0,
      failed: 0,
    };

    const now = new Date();

    for (const target of targets) {
      const data = target.toObject();

      if (!this.isDueForCheck(data, now)) {
        result.skipped += 1;
        continue;
      }

      try {
        await this.checkHealthTargetUseCase.execute(data.healthCheckTargetId);

        result.performed += 1;
      } catch (error) {
        if (error instanceof AssetNotOperationalException) {
          result.skipped += 1;
          continue;
        }

        result.failed += 1;

        const message =
          error instanceof Error ? error.message : 'Unknown health check error';

        this.logger.error(
          `Failed to check health target ${data.healthCheckTargetId}: ${message}`,
        );
      }
    }

    return result;
  }

  private isDueForCheck(
    target: {
      lastCheckedAt: Date | null;
      checkIntervalSeconds: number;
    },
    now: Date,
  ): boolean {
    if (!target.lastCheckedAt) {
      return true;
    }

    const elapsedMilliseconds = now.getTime() - target.lastCheckedAt.getTime();

    const intervalMilliseconds = target.checkIntervalSeconds * 1000;

    return elapsedMilliseconds >= intervalMilliseconds;
  }
}
