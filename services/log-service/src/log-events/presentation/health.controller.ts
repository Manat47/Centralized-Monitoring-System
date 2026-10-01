import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { LogInfrastructure } from '../../log.infrastructure';

@Controller('health')
export class HealthController {
  constructor(private readonly infrastructure: LogInfrastructure) {}

  @Get('ready')
  async ready() {
    try {
      if (await this.infrastructure.ready()) return { status: 'UP' };
    } catch {
      // Readiness reports only the public service state.
    }
    throw new ServiceUnavailableException('Log Service is unavailable');
  }
}
