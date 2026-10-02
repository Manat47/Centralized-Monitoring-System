import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';

import { GenerateReportUseCase } from '../../application/use-cases/generate-report.use-case';

@Injectable()
export class ReportGenerationScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ReportGenerationScheduler.name);
  private interval: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly generateReportUseCase: GenerateReportUseCase) {}

  onModuleInit(): void {
    this.interval = setInterval(() => void this.run(), 5_000);
    void this.run();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (await this.generateReportUseCase.processNext()) {
        // Process one report at a time to bound PDF memory use.
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Report worker failed: ${message}`);
    } finally {
      this.running = false;
    }
  }
}
