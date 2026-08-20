import type { ReportSummary } from '../models/report-summary.model';

export interface GenerateReportPdfInput {
  reportId: string;
  reportType: 'ON_DEMAND' | 'MONTHLY';
  periodStart: Date;
  periodEnd: Date;
  generatedBy: string | null;
  summary: ReportSummary;
}

export interface GenerateReportPdfResult {
  pdfPath: string;
}

export const REPORT_PDF_GENERATOR = Symbol('REPORT_PDF_GENERATOR');

export interface ReportPdfGenerator {
  generate(input: GenerateReportPdfInput): Promise<GenerateReportPdfResult>;
}
