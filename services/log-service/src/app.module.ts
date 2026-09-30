import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DataStore } from './data.store';
import { LogInfrastructure } from './log.infrastructure';
import { ProjectService } from './project.service';
import { IngestService } from './ingest.service';
import { LogQueryService } from './log-query.service';
import { ProjectController } from './project.controller';
import { IngestController } from './ingest.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [ProjectController, IngestController],
  providers: [
    DataStore,
    LogInfrastructure,
    ProjectService,
    IngestService,
    LogQueryService,
  ],
})
export class AppModule {}
