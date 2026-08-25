import { Inject, Injectable } from '@nestjs/common';

import {
  REPORT_REPOSITORY,
  type ReportRepository,
} from '../../domain/repositories/report.repository';
import type {
  ReportStatus,
  ReportType,
} from '../../domain/entities/report.entity';

export interface ListReportsInput {
  reportType?: ReportType;
  status?: ReportStatus;
  assetId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListReportsUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,
  ) {}

  async execute(input: ListReportsInput) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const result = await this.reportRepository.findMany({
      reportType: input.reportType,
      status: input.status,
      assetId: input.assetId,
      page,
      limit,
    });

    return {
      items: result.items.map((report) => {
        const {
          summary: _summary,
          pdfPath: _pdfPath,
          ...metadata
        } = report.toObject();

        return metadata;
      }),
      total: result.total,
      page,
      limit,
    };
  }
}
