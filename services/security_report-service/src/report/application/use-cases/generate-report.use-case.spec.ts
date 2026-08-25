import type { RecordAuditLogUseCase } from '../../../audit/application/use-cases/record-audit-log.use-case';
import { Report } from '../../domain/entities/report.entity';
import type { ReportPdfGenerator } from '../../domain/ports/report-pdf-generator.port';
import type { ReportRepository } from '../../domain/repositories/report.repository';
import type { BuildReportSummaryUseCase } from './build-report-summary.use-case';
import { GenerateReportUseCase } from './generate-report.use-case';

describe('GenerateReportUseCase', () => {
  const periodStart = new Date('2026-08-01T00:00:00.000Z');
  const periodEnd = new Date('2026-08-31T23:59:59.999Z');

  function createDependencies() {
    const repository: jest.Mocked<ReportRepository> = {
      create: jest.fn(async (report) => report),
      update: jest.fn(async (report) => report),
      findById: jest.fn(),
      findMany: jest.fn(),
      findPendingOrCompletedMonthly: jest.fn().mockResolvedValue(null),
    };
    const summaryBuilder = { execute: jest.fn() };
    const generator: jest.Mocked<ReportPdfGenerator> = {
      generate: jest.fn(),
    };
    const audit = { execute: jest.fn().mockResolvedValue(undefined) };
    const useCase = new GenerateReportUseCase(
      repository,
      summaryBuilder as unknown as BuildReportSummaryUseCase,
      generator,
      audit as unknown as RecordAuditLogUseCase,
    );

    return { repository, summaryBuilder, generator, audit, useCase };
  }

  it('returns the existing monthly report instead of creating a duplicate', async () => {
    const dependencies = createDependencies();
    const existing = Report.create('monthly-report', {
      reportType: 'MONTHLY',
      periodStart,
      periodEnd,
    });
    dependencies.repository.findPendingOrCompletedMonthly.mockResolvedValue(
      existing,
    );

    const result = await dependencies.useCase.execute({
      reportType: 'MONTHLY',
      periodStart,
      periodEnd,
    });

    expect(result.reportId).toBe('monthly-report');
    expect(result).not.toHaveProperty('summary');
    expect(result).not.toHaveProperty('pdfPath');
    expect(dependencies.repository.create).not.toHaveBeenCalled();
    expect(dependencies.summaryBuilder.execute).not.toHaveBeenCalled();
  });

  it('persists failure context and emits a failed audit event', async () => {
    const dependencies = createDependencies();
    dependencies.summaryBuilder.execute.mockRejectedValue(
      new Error('Monitoring service unavailable'),
    );

    await expect(
      dependencies.useCase.execute({
        reportType: 'ON_DEMAND',
        periodStart,
        periodEnd,
        generatedBy: '4b384730-569f-43a9-af26-72847553ce08',
        generatedByRole: 'ADMIN',
        generatedByEmail: 'admin@example.com',
      }),
    ).rejects.toThrow('Monitoring service unavailable');

    const failedReport = dependencies.repository.update.mock.calls.at(-1)?.[0];
    expect(failedReport?.toObject()).toMatchObject({
      status: 'FAILED',
      failureCode: 'Error',
      failureMessage: 'Monitoring service unavailable',
    });
    expect(dependencies.audit.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'FAILURE',
        action: 'REPORT_GENERATED',
      }),
    );
  });
});
