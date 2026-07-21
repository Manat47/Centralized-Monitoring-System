import { Controller, Get } from '@nestjs/common';

import {
  SystemStatusResponse,
  SystemStatusService,
} from './system-status.service';

@Controller('system')
export class SystemStatusController {
  constructor(private readonly systemStatusService: SystemStatusService) {}

  @Get('status')
  getStatus(): Promise<SystemStatusResponse> {
    return this.systemStatusService.getStatus();
  }
}
