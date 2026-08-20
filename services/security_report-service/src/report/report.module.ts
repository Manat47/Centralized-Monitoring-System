import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';

import { REPORT_REPOSITORY } from './domain/repositories/report.repository';
import { DrizzleReportRepository } from './infrastructure/persistence/drizzle-report.repository';
import { HttpModule } from '@nestjs/axios';
import { MONITORING_REPORT_READER } from './domain/ports/monitoring-report-reader.port';
import { HttpMonitoringReportReader } from './infrastructure/clients/http-monitoring-report.reader';
import { ALERT_REPORT_READER } from './domain/ports/alert-report-reader.port';
import { HttpAlertReportReader } from './infrastructure/clients/http-alert-report.reader';
import { ASSET_REPORT_READER } from './domain/ports/asset-report-reader.port';
import { HttpAssetReportReader } from './infrastructure/clients/http-asset-report.reader';
import { BuildReportSummaryUseCase } from './application/use-cases/build-report-summary.use-case';
import { GenerateReportUseCase } from './application/use-cases/generate-report.use-case';
import { REPORT_PDF_GENERATOR } from './domain/ports/report-pdf-generator.port';
import { DocxTemplateReportPdfGenerator } from './infrastructure/pdf/docx/docx-template-report-pdf.generator';
import { ReportController } from './presentation/report.controller';
import { ListReportsUseCase } from './application/use-cases/list-reports.use-case';
import { FindReportByIdUseCase } from './application/use-cases/find-report-by-id.use-case';
import { GetReportDownloadUseCase } from './application/use-cases/get-report-download.use-case';
import { MonthlyReportScheduler } from './infrastructure/schedulers/monthly-report.scheduler';

@Module({
  imports: [AuditModule, HttpModule],

  controllers: [ReportController],

  providers: [
    BuildReportSummaryUseCase,
    GenerateReportUseCase,
    ListReportsUseCase,
    FindReportByIdUseCase,
    GetReportDownloadUseCase,
    MonthlyReportScheduler,
    {
      provide: REPORT_REPOSITORY,
      useClass: DrizzleReportRepository,
    },
    {
      provide: MONITORING_REPORT_READER,
      useClass: HttpMonitoringReportReader,
    },
    {
      provide: ALERT_REPORT_READER,
      useClass: HttpAlertReportReader,
    },
    {
      provide: ASSET_REPORT_READER,
      useClass: HttpAssetReportReader,
    },
    {
      provide: REPORT_PDF_GENERATOR,
      useClass: DocxTemplateReportPdfGenerator,
    },
  ],
  exports: [REPORT_REPOSITORY],
})
export class ReportModule {}
