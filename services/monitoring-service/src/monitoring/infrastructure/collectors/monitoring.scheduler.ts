import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { CollectEnabledTargetsUseCase } from '../../application/use-cases/collect-enabled-targets.use-case';
import { EvaluateMetricRulesUseCase } from '../../application/use-cases/evaluate-metric-rules.use-case';
import { CheckEnabledHealthTargetsUseCase } from '../../application/use-cases/check-enabled-health-targets.use-case';

@Injectable()
export class MonitoringScheduler {
  private readonly logger = new Logger(MonitoringScheduler.name);

  constructor(
    private readonly collectEnabledTargetsUseCase: CollectEnabledTargetsUseCase,
    private readonly evaluateMetricRulesUseCase: EvaluateMetricRulesUseCase,
    private readonly checkEnabledHealthTargetsUseCase: CheckEnabledHealthTargetsUseCase,
  ) {}

  @Cron('*/5 * * * * *', { waitForCompletion: true })
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

      this.logger.error(`Scheduled metric collection failed: ${message}`);
    }
  }

  @Cron('2/15 * * * * *', { waitForCompletion: true })
  async checkHealthTargets(): Promise<void> {
    try {
      const result = await this.checkEnabledHealthTargetsUseCase.execute();

      if (result.performed > 0 || result.failed > 0) {
        this.logger.log(
          `Health: Checked=${result.checked}, Performed=${result.performed}, Skipped=${result.skipped}, Failed=${result.failed}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown scheduler error';

      this.logger.error(`Scheduled health checking failed: ${message}`);
    }
  }

  @Cron('*/5 * * * * *', { waitForCompletion: true })
  async evaluateMetricRules(): Promise<void> {
    try {
      const evaluationResult = await this.evaluateMetricRulesUseCase.execute();

      if (evaluationResult.triggered > 0 || evaluationResult.recovered > 0) {
        this.logger.warn(
          `Threshold: Checked=${evaluationResult.checked}, Triggered=${evaluationResult.triggered}, Recovered=${evaluationResult.recovered}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown scheduler error';

      this.logger.error(`Scheduled metric rule evaluation failed: ${message}`);
    }
  }
}
