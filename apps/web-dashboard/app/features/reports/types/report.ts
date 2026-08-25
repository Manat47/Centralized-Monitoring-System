export type ReportType = "ON_DEMAND" | "MONTHLY";
export type ReportStatus = "GENERATING" | "COMPLETED" | "FAILED";

export interface ReportListItem {
  reportId: string;
  reportType: ReportType;
  assetId: string | null;
  periodStart: string;
  periodEnd: string;
  generatedBy: string | null;
  generatedByEmail: string | null;
  status: ReportStatus;
  templateVersion: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportListResponse {
  items: ReportListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ListReportsParams {
  reportType?: ReportType;
  status?: ReportStatus;
  assetId?: string;
  page?: number;
  limit?: number;
}

export interface GenerateReportInput {
  assetId?: string;
  periodStart: string;
  periodEnd: string;
}
