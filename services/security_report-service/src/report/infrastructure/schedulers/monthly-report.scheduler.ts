import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { GenerateReportUseCase } from '../../application/use-cases/generate-report.use-case';

@Injectable()
export class MonthlyReportScheduler {
  private readonly logger = new Logger(MonthlyReportScheduler.name);

  constructor(private readonly generateReportUseCase: GenerateReportUseCase) {}

  @Cron('0 0 0 1 * *', {
    timeZone: 'Asia/Bangkok',
  })
  async generatePreviousMonthReport(): Promise<void> {
    const { periodStart, periodEnd } = this.getPreviousMonthPeriod();

    this.logger.log(
      `Generating monthly report: ${periodStart.toISOString()} - ${periodEnd.toISOString()}`,
    );

    try {
      const report = await this.generateReportUseCase.execute({
        reportType: 'MONTHLY',
        assetId: null,

        periodStart,
        periodEnd,

        // scheduler เป็นคนสร้าง ไม่ใช่ user
        generatedBy: null,
      });

      this.logger.log(`Monthly report generated: ${report.reportId}`);
    } catch (error) {
      console.dir(error, {
        depth: null,
      });

      this.logger.error(
        'Monthly report generation failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private getPreviousMonthPeriod(): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const now = new Date();

    const bangkokParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'numeric',
    }).formatToParts(now);

    const year = Number(
      bangkokParts.find((part) => part.type === 'year')?.value,
    );

    const month = Number(
      bangkokParts.find((part) => part.type === 'month')?.value,
    );

    // month จาก Intl = 1-12
    // Date.UTC ใช้ 0-11
    const currentMonthStartUtc =
      Date.UTC(year, month - 1, 1) - 7 * 60 * 60 * 1000;

    const previousMonthStartUtc =
      Date.UTC(year, month - 2, 1) - 7 * 60 * 60 * 1000;

    return {
      periodStart: new Date(previousMonthStartUtc),

      // repository ตอนนี้ใช้ <= periodEnd
      // เลยจบที่ 1 ms ก่อนเดือนใหม่
      periodEnd: new Date(currentMonthStartUtc - 1),
    };
  }
}
