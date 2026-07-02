import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { CollectEnabledTargetsUseCase } from '../../application/use-cases/collect-enabled-targets.use-case';

@Injectable()
export class MonitoringScheduler {
  private readonly logger = new Logger(MonitoringScheduler.name);

  constructor(
    private readonly collectEnabledTargetsUseCase: CollectEnabledTargetsUseCase,
  ) {}

  @Cron('*/5 * * * * *')
  async collectMetrics(): Promise<void> {
    try {
      const result = await this.collectEnabledTargetsUseCase.execute();

      if (result.collected > 0 || result.failed > 0) {
        this.logger.log(
          `Checked=${result.checked}, Collected=${result.collected}, Skipped=${result.skipped}, Failed=${result.failed}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown scheduler error';

      this.logger.error(`Scheduled collection failed: ${message}`);
    }
  }
}
