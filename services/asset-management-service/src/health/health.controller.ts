import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      service: 'asset-management-service',
      status: 'ok',
    };
  }
}
