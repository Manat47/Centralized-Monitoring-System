import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  async getReadiness() {
    const result = await this.healthService.getReadiness();

    if (result.status === 'not_ready') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
