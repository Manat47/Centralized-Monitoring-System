import {
  Body,
  Controller,
  Get,
  Post,
  ParseUUIDPipe,
  Param,
  Query,
  Headers,
  Patch,
} from '@nestjs/common';

import { CreateHealthCheckTargetUseCase } from '../application/use-cases/create-health-check-target.use-case';
import { CreateHealthCheckTargetDto } from './dto/create-health-check-target.dto';
import { EnableHealthCheckTargetUseCase } from '../application/use-cases/enable-health-check-target.use-case';
import { DisableHealthCheckTargetUseCase } from '../application/use-cases/disable-health-check-target.use-case';
import { QueryHealthCheckHistoryUseCase } from '../application/use-cases/query-health-check-history.use-case';
import { QueryTimeRangeDto } from './dto/query-time-range.dto';
import { FindHealthCheckTargetByIdUseCase } from '../application/use-cases/find-health-check-target-by-id.use-case';
import { FindHealthCheckTargetsUseCase } from '../application/use-cases/find-health-check-targets.use-case';
import { QueryLatestHealthCheckUseCase } from '../application/use-cases/query-latest-health-check.use-case';
import { QueryHealthReportSummaryUseCase } from '../application/use-cases/query-health-report-summary.use-case';
import { UpdateHealthCheckTargetDto } from './dto/update-health-check-target.dto';
import { UpdateHealthCheckTargetUseCase } from '../application/use-cases/update-health-check-target.use-case';
import { ArchiveHealthCheckTargetUseCase } from '../application/use-cases/archive-health-check-target.use-case';
import { CheckHealthTargetUseCase } from '../application/use-cases/check-health-target.use-case';

@Controller('health-check-targets')
export class HealthCheckTargetsController {
  constructor(
    private readonly createHealthCheckTargetUseCase: CreateHealthCheckTargetUseCase,
    private readonly enableHealthCheckTargetUseCase: EnableHealthCheckTargetUseCase,
    private readonly disableHealthCheckTargetUseCase: DisableHealthCheckTargetUseCase,
    private readonly queryHealthCheckHistoryUseCase: QueryHealthCheckHistoryUseCase,
    private readonly findHealthCheckTargetByIdUseCase: FindHealthCheckTargetByIdUseCase,
    private readonly findHealthCheckTargetsUseCase: FindHealthCheckTargetsUseCase,
    private readonly queryLatestHealthCheckUseCase: QueryLatestHealthCheckUseCase,
    private readonly queryHealthReportSummaryUseCase: QueryHealthReportSummaryUseCase,
    private readonly updateHealthCheckTargetUseCase: UpdateHealthCheckTargetUseCase,
    private readonly archiveHealthCheckTargetUseCase: ArchiveHealthCheckTargetUseCase,
    private readonly checkHealthTargetUseCase: CheckHealthTargetUseCase,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateHealthCheckTargetDto,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    const target = await this.createHealthCheckTargetUseCase.execute({
      ...dto,
      actorUserId,
      actorRole,
      actorEmail,
    });

    return target.toObject();
  }

  @Post(':id/enable')
  async enable(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    const target = await this.enableHealthCheckTargetUseCase.execute(id, {
      actorUserId,
      actorRole,
      actorEmail,
    });

    return target.toObject();
  }

  @Post(':id/disable')
  async disable(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    const target = await this.disableHealthCheckTargetUseCase.execute(id, {
      actorUserId,
      actorRole,
      actorEmail,
    });

    return target.toObject();
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateHealthCheckTargetDto,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    const target = await this.updateHealthCheckTargetUseCase.execute(id, {
      ...dto,
      actorUserId,
      actorRole,
      actorEmail,
    });

    return target.toObject();
  }

  @Post(':id/check-now')
  async checkNow(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    return this.checkHealthTargetUseCase.execute(id, {
      actorUserId,
      actorRole,
      actorEmail,
    });
  }

  @Post(':id/archive')
  async archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('x-user-id') actorUserId: string,
    @Headers('x-user-role') actorRole: 'ADMIN' | 'OPERATOR',
    @Headers('x-user-email') actorEmail: string | undefined,
  ) {
    const target = await this.archiveHealthCheckTargetUseCase.execute(id, {
      actorUserId,
      actorRole,
      actorEmail,
    });

    return target.toObject();
  }

  @Get(':id/history')
  async getHistory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: QueryTimeRangeDto,
  ) {
    return this.queryHealthCheckHistoryUseCase.execute({
      healthCheckTargetId: id,
      start: new Date(query.start),
      end: new Date(query.end),
    });
  }

  @Get(':id/report-summary')
  async getReportSummary(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: QueryTimeRangeDto,
  ) {
    return this.queryHealthReportSummaryUseCase.execute({
      healthCheckTargetId: id,
      start: new Date(query.start),
      end: new Date(query.end),
    });
  }

  @Get()
  async findAll() {
    return this.findHealthCheckTargetsUseCase.execute();
  }

  @Get(':id')
  async findById(@Param('id', new ParseUUIDPipe()) id: string) {
    const target = await this.findHealthCheckTargetByIdUseCase.execute(id);

    return target.toObject();
  }

  @Get(':id/latest')
  async getLatest(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.queryLatestHealthCheckUseCase.execute(id);
  }
}
