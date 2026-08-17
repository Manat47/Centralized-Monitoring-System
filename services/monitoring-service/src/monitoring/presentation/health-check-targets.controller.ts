import {
  Body,
  Controller,
  Get,
  Post,
  ParseUUIDPipe,
  Param,
  Query,
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
  ) {}

  @Post()
  async create(@Body() dto: CreateHealthCheckTargetDto) {
    const target = await this.createHealthCheckTargetUseCase.execute(dto);

    return target.toObject();
  }
  @Post(':id/enable')
  async enable(@Param('id', new ParseUUIDPipe()) id: string) {
    const target = await this.enableHealthCheckTargetUseCase.execute(id);

    return target.toObject();
  }

  @Post(':id/disable')
  async disable(@Param('id', new ParseUUIDPipe()) id: string) {
    const target = await this.disableHealthCheckTargetUseCase.execute(id);

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

  @Get()
  async findAll() {
    const targets = await this.findHealthCheckTargetsUseCase.execute();

    return targets.map((target) => target.toObject());
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
