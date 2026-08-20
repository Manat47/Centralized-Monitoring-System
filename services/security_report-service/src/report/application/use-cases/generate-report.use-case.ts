import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { Report, type ReportType } from '../../domain/entities/report.entity';

import {
  REPORT_REPOSITORY,
  type ReportRepository,
} from '../../domain/repositories/report.repository';

import {
  REPORT_PDF_GENERATOR,
  type ReportPdfGenerator,
} from '../../domain/ports/report-pdf-generator.port';

import { BuildReportSummaryUseCase } from './build-report-summary.use-case';

export interface GenerateReportInput {
  reportType: ReportType;
  assetId?: string | null;

  periodStart: Date;
  periodEnd: Date;

  generatedBy?: string | null;
}

@Injectable()
export class GenerateReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,

    private readonly buildReportSummaryUseCase: BuildReportSummaryUseCase,

    @Inject(REPORT_PDF_GENERATOR)
    private readonly reportPdfGenerator: ReportPdfGenerator,
  ) {}

  async execute(input: GenerateReportInput) {
    const report = Report.create(randomUUID(), {
      reportType: input.reportType,
      assetId: input.assetId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      generatedBy: input.generatedBy,
    });

    await this.reportRepository.create(report);

    try {
      const summary = await this.buildReportSummaryUseCase.execute({
        assetId: input.assetId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      });

      const reportData = report.toObject();

      const pdf = await this.reportPdfGenerator.generate({
        reportId: reportData.reportId,
        reportType: reportData.reportType,
        periodStart: reportData.periodStart,
        periodEnd: reportData.periodEnd,
        generatedBy: reportData.generatedBy,
        summary,
      });

      report.complete({ ...summary }, pdf.pdfPath);

      await this.reportRepository.update(report);

      return report.toObject();
    } catch (error) {
      report.fail();

      await this.reportRepository.update(report);

      throw error;
    }
  }
}
