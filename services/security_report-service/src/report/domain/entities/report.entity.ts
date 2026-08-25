export type ReportType = 'ON_DEMAND' | 'MONTHLY';

export type ReportStatus = 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface ReportProps {
  reportId: string;

  reportType: ReportType;

  // null = report รวมทุก asset
  assetId: string | null;

  periodStart: Date;
  periodEnd: Date;

  // monthly report อาจไม่มี user เป็นคนกด
  generatedBy: string | null;

  generatedByEmail: string | null;

  status: ReportStatus;

  summary: Record<string, unknown> | null;

  pdfPath: string | null;

  templateVersion: string | null;

  failureCode: string | null;

  failureMessage: string | null;

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

  generatedByEmail?: string | null;
}

export class Report {
  private constructor(private props: ReportProps) {}

  static create(reportId: string, input: CreateReportProps): Report {
    if (input.periodStart >= input.periodEnd) {
      throw new Error('Report period start must be before period end');
    }

    const now = new Date();

    return new Report({
      reportId,
      reportType: input.reportType,
      assetId: input.assetId ?? null,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      generatedBy: input.generatedBy ?? null,
      generatedByEmail: input.generatedByEmail ?? null,

      status: 'GENERATING',

      summary: null,
      pdfPath: null,
      templateVersion: null,
      failureCode: null,
      failureMessage: null,
      generatedAt: null,

      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ReportProps): Report {
    return new Report(props);
  }

  complete(
    summary: Record<string, unknown>,
    pdfPath: string,
    templateVersion: string,
  ): void {
    this.props.summary = summary;
    this.props.pdfPath = pdfPath;
    this.props.templateVersion = templateVersion;
    this.props.failureCode = null;
    this.props.failureMessage = null;
    this.props.status = 'COMPLETED';
    this.props.generatedAt = new Date();
    this.props.updatedAt = new Date();
  }

  fail(error: { code: string; message: string }): void {
    this.props.status = 'FAILED';
    this.props.failureCode = error.code;
    this.props.failureMessage = error.message;
    this.props.updatedAt = new Date();
  }

  toObject(): ReportProps {
    return { ...this.props };
  }
}
