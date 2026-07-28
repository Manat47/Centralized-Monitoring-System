import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { DashboardModule } from './dashboard/dashboard.module';
import { SystemStatusModule } from './system-status/system-status.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    JwtModule.register({}),

    DashboardModule,
    SystemStatusModule,
  ],
})
export class AppModule {}
