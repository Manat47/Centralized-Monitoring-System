import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { MonthlyReportScheduler } from '../report/infrastructure/schedulers/monthly-report.scheduler';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const scheduler = app.get(MonthlyReportScheduler);

    await scheduler.generatePreviousMonthReport();

    console.log('Monthly report test completed');
  } finally {
    await app.close();
  }
}

void bootstrap();
