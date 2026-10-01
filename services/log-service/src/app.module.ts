import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DataStore } from './data.store';
import { LogInfrastructure } from './log.infrastructure';
import { ProjectService } from './project.service';
import { IngestService } from './ingest.service';
import { LogQueryService } from './log-query.service';
import { ProjectController } from './project.controller';
import { IngestController } from './ingest.controller';
import { ActivityController } from './log-events/presentation/activity.controller';
import { GatewayActorService } from './log-events/presentation/gateway-actor.service';
import { ActivityAnalysisService } from './log-events/application/services/activity-analysis.service';
import { ProcessActivityEventUseCase } from './log-events/application/use-cases/process-activity-event.use-case';
import { PostgresActivityRepository } from './log-events/infrastructure/persistence/postgres-activity.repository';
import { ACTIVITY_REPOSITORY } from './log-events/domain/repositories/activity.repository';
import { HealthController } from './log-events/presentation/health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [
    ProjectController,
    IngestController,
    ActivityController,
    HealthController,
  ],
  providers: [
    DataStore,
    LogInfrastructure,
    ProjectService,
    IngestService,
    LogQueryService,
    GatewayActorService,
    ActivityAnalysisService,
    ProcessActivityEventUseCase,
    PostgresActivityRepository,
    { provide: ACTIVITY_REPOSITORY, useExisting: PostgresActivityRepository },
  ],
})
export class AppModule {}
