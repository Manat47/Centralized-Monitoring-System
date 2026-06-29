import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  Post,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';

import { CreateMonitoringTargetUseCase } from '../application/use-cases/create-monitoring-target.use-case';
import { CreateMonitoringTargetDto } from './dto/create-monitoring-target.dto';
import { VerifyMonitoringTargetUseCase } from '../application/use-cases/verify-monitoring-target.use-case';

@Controller('monitoring-targets')
export class MonitoringTargetsController {
  constructor(
    private readonly createMonitoringTargetUseCase: CreateMonitoringTargetUseCase,
    private readonly verifyMonitoringTargetUseCase: VerifyMonitoringTargetUseCase,
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
}
