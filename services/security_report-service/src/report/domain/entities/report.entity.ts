export type ReportType = 'ON_DEMAND' | 'MONTHLY';

export type ReportStatus = 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface ReportProps {
  reportId: string;

  reportType: ReportType;

  assetId: string | null;

  periodStart: Date;
  periodEnd: Date;

  generatedBy: string | null;

  status: ReportStatus;

  summary: Record<string, unknown> | null;

  pdfPath: string | null;

  generatedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReportProps {
  reportType: ReportType;
  assetId?: string | null;
  periodStart: Date;
  periodEnd: Date;
  generatedBy?: string | null;
}

export class Report {
  private constructor(private props: ReportProps) {}

  static create(reportId: string, props: CreateReportProps): Report {
    if (props.periodStart >= props.periodEnd) {
      throw new Error('Report period start must be before end');
    }

    const now = new Date();

    return new Report({
      reportId,
      reportType: props.reportType,
      assetId: props.assetId ?? null,
      periodStart: props.periodStart,
      periodEnd: props.periodEnd,
      generatedBy: props.generatedBy ?? null,
      status: 'GENERATING',
      summary: null,
      pdfPath: null,
      generatedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ReportProps): Report {
    return new Report(props);
  }

  complete(summary: Record<string, unknown>, pdfPath: string): void {
    this.props.summary = summary;
    this.props.pdfPath = pdfPath;
    this.props.status = 'COMPLETED';
    this.props.generatedAt = new Date();
    this.props.updatedAt = new Date();
  }

  fail(): void {
    this.props.status = 'FAILED';
    this.props.updatedAt = new Date();
  }

  toObject(): ReportProps {
    return { ...this.props };
  }
}
