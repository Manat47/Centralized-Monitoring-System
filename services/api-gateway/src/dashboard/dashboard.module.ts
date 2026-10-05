import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [HttpModule.register({ timeout: 5_000 })],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
