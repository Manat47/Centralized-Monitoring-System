import { Report } from './report.entity';

describe('Report', () => {
  const periodStart = new Date('2026-08-01T00:00:00.000Z');
  const periodEnd = new Date('2026-08-31T23:59:59.999Z');

  it('records artifact metadata when generation completes', () => {
    const report = Report.create('report-1', {
      reportType: 'ON_DEMAND',
      periodStart,
      periodEnd,
      generatedBy: 'user-1',
      generatedByEmail: 'admin@example.com',
    });

    report.complete({ assets: [] }, 'storage/reports/report-1.pdf', 'v9');

    expect(report.toObject()).toMatchObject({
      status: 'COMPLETED',
      generatedByEmail: 'admin@example.com',
      pdfPath: 'storage/reports/report-1.pdf',
      templateVersion: 'v9',
      failureCode: null,
      failureMessage: null,
    });
  });

  it('records a sanitized failure for investigation', () => {
    const report = Report.create('report-2', {
      reportType: 'ON_DEMAND',
      periodStart,
      periodEnd,
    });

    report.fail({
      code: 'ServiceUnavailableException',
      message: 'Monitoring unavailable',
    });

    expect(report.toObject()).toMatchObject({
      status: 'FAILED',
      failureCode: 'ServiceUnavailableException',
      failureMessage: 'Monitoring unavailable',
      generatedAt: null,
    });
  });
});
