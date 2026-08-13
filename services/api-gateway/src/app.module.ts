import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { DashboardModule } from './dashboard/dashboard.module';
import { SystemStatusModule } from './system-status/system-status.module';
import {
  PrometheusModule,
  makeCounterProvider,
} from '@willsoto/nestjs-prometheus';
import { HttpMetricsMiddleware } from './metrics/http-metrics.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    JwtModule.register({}),

    PrometheusModule.register(
      /*{กำหนดpath ที่ต้องการให้ Prometheus ใช้สำหรับ metrics ของแอปพลิเคชันนี้}*/
    ),

    DashboardModule,
    SystemStatusModule,
  ],
  providers: [
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'status_code'],
    }),

    HttpMetricsMiddleware,
  ],
})
export class AppModule {}
