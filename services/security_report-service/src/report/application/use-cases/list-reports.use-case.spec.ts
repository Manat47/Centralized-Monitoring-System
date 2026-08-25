import { Report } from '../../domain/entities/report.entity';
import type { ReportRepository } from '../../domain/repositories/report.repository';
import { ListReportsUseCase } from './list-reports.use-case';

describe('ListReportsUseCase', () => {
  it('returns paginated metadata without the stored summary or file path', async () => {
    const report = Report.create('report-1', {
      reportType: 'ON_DEMAND',
      periodStart: new Date('2026-08-01T00:00:00.000Z'),
      periodEnd: new Date('2026-08-02T00:00:00.000Z'),
    });
    report.complete({ private: 'large summary' }, 'storage/private.pdf', 'v9');
    const repository: jest.Mocked<ReportRepository> = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn().mockResolvedValue({ items: [report], total: 1 }),
      findPendingOrCompletedMonthly: jest.fn(),
    };
    const useCase = new ListReportsUseCase(repository);

    const result = await useCase.execute({ page: 1, limit: 20 });

    expect(result).toMatchObject({ total: 1, page: 1, limit: 20 });
    expect(result.items[0]).not.toHaveProperty('summary');
    expect(result.items[0]).not.toHaveProperty('pdfPath');
  });
});
