import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  REPORT_REPOSITORY,
  type ReportRepository,
} from '../../domain/repositories/report.repository';

@Injectable()
export class FindReportByIdUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,
  ) {}

  async execute(reportId: string) {
    const report = await this.reportRepository.findById(reportId);

    if (!report) {
      throw new NotFoundException(`Report ${reportId} was not found`);
    }

    const { pdfPath: _pdfPath, ...result } = report.toObject();

    return result;
  }
}
