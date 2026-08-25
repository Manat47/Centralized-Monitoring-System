import type {
  Report,
  ReportStatus,
  ReportType,
} from '../entities/report.entity';

export interface FindReportsInput {
  reportType?: ReportType;
  status?: ReportStatus;
  assetId?: string;
  page: number;
  limit: number;
}

export interface FindReportsResult {
  items: Report[];
  total: number;
}

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface ReportRepository {
  create(report: Report): Promise<Report>;

  update(report: Report): Promise<Report>;

  findById(reportId: string): Promise<Report | null>;

  findMany(input: FindReportsInput): Promise<FindReportsResult>;

  findPendingOrCompletedMonthly(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Report | null>;
}
