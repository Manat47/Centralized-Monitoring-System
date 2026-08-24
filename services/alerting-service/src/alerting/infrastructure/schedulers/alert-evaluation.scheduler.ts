import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';

import { EvaluateStaleHealthChecksUseCase } from '../../application/use-cases/evaluate-stale-health-checks.use-case';

@Injectable()
export class AlertEvaluationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertEvaluationScheduler.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private readonly evaluateStaleHealthChecksUseCase: EvaluateStaleHealthChecksUseCase,
  ) {}

  onModuleInit(): void {
    this.interval = setInterval(() => {
      void this.evaluateStaleHealthChecks();
    }, 5_000);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async evaluateStaleHealthChecks(): Promise<void> {
    try {
      const triggered = await this.evaluateStaleHealthChecksUseCase.execute();

      if (triggered > 0) {
        this.logger.warn(`Triggered ${triggered} stale health check alert(s)`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown evaluation error';
      this.logger.error(`Failed to evaluate stale health checks: ${message}`);
    }
  }
}
