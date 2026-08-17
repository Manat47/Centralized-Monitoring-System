import type { Report } from '../entities/report.entity';

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface ReportRepository {
  create(report: Report): Promise<Report>;

  update(report: Report): Promise<Report>;

  findById(reportId: string): Promise<Report | null>;

  findAll(): Promise<Report[]>;
}
