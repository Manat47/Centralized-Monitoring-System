import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  REPORT_REPOSITORY,
  type ReportRepository,
} from '../../domain/repositories/report.repository';

export interface ReportDownload {
  reportId: string;
  pdfPath: string;
  fileName: string;
}

@Injectable()
export class GetReportDownloadUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,
  ) {}

  async execute(reportId: string): Promise<ReportDownload> {
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new NotFoundException(`Report ${reportId} was not found`);
    }

    const data = report.toObject();

    if (data.status !== 'COMPLETED') {
      throw new ConflictException('Report is not ready for download');
    }

    if (!data.pdfPath) {
      throw new NotFoundException('Report PDF was not found');
    }

    return {
      reportId: data.reportId,
      pdfPath: data.pdfPath,
      fileName: `monitoring-report-${data.reportId}.pdf`,
    };
  }
}
