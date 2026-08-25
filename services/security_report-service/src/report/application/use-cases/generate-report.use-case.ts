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
import { RecordAuditLogUseCase } from '../../../audit/application/use-cases/record-audit-log.use-case';
import type { AuditActorRole } from '../../../audit/domain/entities/audit-log.entity';

export interface GenerateReportInput {
  reportType: ReportType;
  assetId?: string | null;

  periodStart: Date;
  periodEnd: Date;

  generatedBy?: string | null;
  generatedByRole?: AuditActorRole | null;
  generatedByEmail?: string | null;
}

@Injectable()
export class GenerateReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,

    private readonly buildReportSummaryUseCase: BuildReportSummaryUseCase,

    @Inject(REPORT_PDF_GENERATOR)
    private readonly reportPdfGenerator: ReportPdfGenerator,

    private readonly recordAuditLogUseCase: RecordAuditLogUseCase,
  ) {}

  async execute(input: GenerateReportInput) {
    if (input.reportType === 'MONTHLY') {
      const existing =
        await this.reportRepository.findPendingOrCompletedMonthly(
          input.periodStart,
          input.periodEnd,
        );

      if (existing) {
        return this.toMetadata(existing.toObject());
      }
    }

    const report = Report.create(randomUUID(), {
      reportType: input.reportType,
      assetId: input.assetId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      generatedBy: input.generatedBy,
      generatedByEmail: input.generatedByEmail,
    });

    try {
      await this.reportRepository.create(report);
    } catch (error) {
      if (input.reportType === 'MONTHLY') {
        const existing =
          await this.reportRepository.findPendingOrCompletedMonthly(
            input.periodStart,
            input.periodEnd,
          );

        if (existing) {
          return this.toMetadata(existing.toObject());
        }
      }

      throw error;
    }

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
        generatedBy:
          reportData.generatedByEmail ?? reportData.generatedBy ?? null,
        summary,
      });

      report.complete({ ...summary }, pdf.pdfPath, pdf.templateVersion);

      await this.reportRepository.update(report);

      await this.recordUserAuditEvent(report.toObject(), input, 'SUCCESS');

      return this.toMetadata(report.toObject());
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      report.fail({
        code: failure.name || 'REPORT_GENERATION_FAILED',
        message: this.sanitizeFailureMessage(failure.message),
      });

      await this.reportRepository.update(report);

      await this.recordUserAuditEvent(
        report.toObject(),
        input,
        'FAILURE',
        failure,
      );

      throw error;
    }
  }

  private sanitizeFailureMessage(message: string): string {
    const normalized = message.replace(/\s+/g, ' ').trim();

    return (normalized || 'Report generation failed').slice(0, 500);
  }

  private toMetadata(report: ReturnType<Report['toObject']>) {
    const metadata: Partial<ReturnType<Report['toObject']>> = { ...report };

    delete metadata.summary;
    delete metadata.pdfPath;

    return metadata;
  }

  private async recordUserAuditEvent(
    report: ReturnType<Report['toObject']>,
    input: GenerateReportInput,
    result: 'SUCCESS' | 'FAILURE',
    error?: Error,
  ): Promise<void> {
    if (!input.generatedBy || !input.generatedByRole) {
      return;
    }

    await this.recordAuditLogUseCase.execute({
      eventId: randomUUID(),
      schemaVersion: 1,
      actorUserId: input.generatedBy,
      actorRole: input.generatedByRole,
      actorEmail: input.generatedByEmail,
      action: 'REPORT_GENERATED',
      resourceType: 'REPORT',
      resourceId: report.reportId,
      resourceName: `${report.reportType === 'ON_DEMAND' ? 'On-demand' : 'Monthly'} report`,
      result,
      sourceService: 'security-report-service',
      metadata: {
        assetId: report.assetId,
        periodStart: report.periodStart.toISOString(),
        periodEnd: report.periodEnd.toISOString(),
      },
      errorCode: error?.name,
      errorMessage: error?.message,
      occurredAt: new Date(),
    });
  }
}
