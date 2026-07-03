import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  Post,
  Param,
  ParseUUIDPipe,
  Get,
  Query,
} from '@nestjs/common';

import { CreateMonitoringTargetUseCase } from '../application/use-cases/create-monitoring-target.use-case';
import { CreateMonitoringTargetDto } from './dto/create-monitoring-target.dto';
import { VerifyMonitoringTargetUseCase } from '../application/use-cases/verify-monitoring-target.use-case';
import { EnableMonitoringUseCase } from '../application/use-cases/enable-monitoring.use-case';
import { DisableMonitoringUseCase } from '../application/use-cases/disable-monitoring.use-case';
import { CollectTargetMetricsUseCase } from '../application/use-cases/collect-target-metrics.use-case';
import { QueryMetricUseCase } from '../application/use-cases/query-metric.use-case';
import { QueryMetricDto } from './dto/query-metric.dto';
import { QueryMemoryUsageUseCase } from '../application/use-cases/query-memory-usage.use-case';
import { QueryTimeRangeDto } from './dto/query-time-range.dto';

@Controller('monitoring-targets')
export class MonitoringTargetsController {
  constructor(
    private readonly createMonitoringTargetUseCase: CreateMonitoringTargetUseCase,
    private readonly verifyMonitoringTargetUseCase: VerifyMonitoringTargetUseCase,
    private readonly enableMonitoringUseCase: EnableMonitoringUseCase,
    private readonly disableMonitoringUseCase: DisableMonitoringUseCase,
    private readonly collectTargetMetricsUseCase: CollectTargetMetricsUseCase,
    private readonly queryMetricUseCase: QueryMetricUseCase,
    private readonly queryMemoryUsageUseCase: QueryMemoryUsageUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateMonitoringTargetDto) {
    try {
      const target = await this.createMonitoringTargetUseCase.execute(dto);

      return target.toObject();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Post(':id/verify')
  async verify(@Param('id', new ParseUUIDPipe()) id: string) {
    const target = await this.verifyMonitoringTargetUseCase.execute(id);

    return target.toObject();
  }

  @Post(':id/enable')
  async enable(@Param('id', new ParseUUIDPipe()) id: string) {
    const target = await this.enableMonitoringUseCase.execute(id);

    return target.toObject();
  }

  @Post(':id/disable')
  async disable(@Param('id', new ParseUUIDPipe()) id: string) {
    const target = await this.disableMonitoringUseCase.execute(id);

    return target.toObject();
  }

  @Post(':id/collect')
  async collect(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.collectTargetMetricsUseCase.execute(id);
  }

  @Get(':assetId/metrics')
  async queryMetric(
    @Param('assetId', new ParseUUIDPipe())
    assetId: string,

    @Query()
    query: QueryMetricDto,
  ) {
    return this.queryMetricUseCase.execute({
      assetId,
      measurement: query.measurement,
      start: new Date(query.start),
      end: new Date(query.end),
    });
  }

  @Get(':assetId/metrics/memory-usage')
  async queryMemoryUsage(
    @Param('assetId', new ParseUUIDPipe())
    assetId: string,

    @Query()
    query: QueryTimeRangeDto,
  ) {
    return this.queryMemoryUsageUseCase.execute({
      assetId,
      start: new Date(query.start),
      end: new Date(query.end),
    });
  }

}
