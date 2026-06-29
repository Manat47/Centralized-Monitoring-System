import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  Post,
} from '@nestjs/common';

import { CreateMonitoringTargetUseCase } from '../application/use-cases/create-monitoring-target.use-case';
import { CreateMonitoringTargetDto } from './dto/create-monitoring-target.dto';

@Controller('monitoring-targets')
export class MonitoringTargetsController {
  constructor(
    private readonly createMonitoringTargetUseCase: CreateMonitoringTargetUseCase,
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
}
