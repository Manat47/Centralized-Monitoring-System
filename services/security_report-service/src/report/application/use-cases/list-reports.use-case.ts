import { Inject, Injectable } from '@nestjs/common';

import {
  REPORT_REPOSITORY,
  type ReportRepository,
} from '../../domain/repositories/report.repository';

@Injectable()
export class ListReportsUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,
  ) {}

  async execute() {
    const reports = await this.reportRepository.findAll();

    return reports.map((report) => report.toObject());
  }
}
