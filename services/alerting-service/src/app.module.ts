import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AlertingModule } from './alerting/alerting.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AlertingModule,
  ],
})
export class AppModule {}
