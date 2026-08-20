import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  NotFoundException,
  Post,
  StreamableFile,
} from '@nestjs/common';

import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';

import { GenerateReportUseCase } from '../application/use-cases/generate-report.use-case';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ListReportsUseCase } from '../application/use-cases/list-reports.use-case';
import { FindReportByIdUseCase } from '../application/use-cases/find-report-by-id.use-case';
import { GetReportDownloadUseCase } from '../application/use-cases/get-report-download.use-case';

@Controller('reports')
export class ReportController {
  constructor(
    private readonly generateReportUseCase: GenerateReportUseCase,
    private readonly listReportsUseCase: ListReportsUseCase,
    private readonly findReportByIdUseCase: FindReportByIdUseCase,
    private readonly getReportDownloadUseCase: GetReportDownloadUseCase,
  ) {}

  @Get()
  async findAll() {
    return this.listReportsUseCase.execute();
  }

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.findReportByIdUseCase.execute(id);
  }

  @Get(':id/download')
  async download(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<StreamableFile> {
    const report = await this.getReportDownloadUseCase.execute(id);

    const pdfPath = path.resolve(process.cwd(), report.pdfPath);

    try {
      await access(pdfPath);
    } catch {
      throw new NotFoundException('Report PDF file was not found');
    }

    const file = createReadStream(pdfPath);

    return new StreamableFile(file, {
      type: 'application/pdf',
      disposition: `attachment; filename="${report.fileName}"`,
    });
  }

  @Post('generate')
  async generate(
    @Body() dto: GenerateReportDto,
    @Headers('x-user-id') generatedBy: string,
  ) {
    return this.generateReportUseCase.execute({
      reportType: 'ON_DEMAND',

      assetId: dto.assetId ?? null,

      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),

      generatedBy,
    });
  }
}
