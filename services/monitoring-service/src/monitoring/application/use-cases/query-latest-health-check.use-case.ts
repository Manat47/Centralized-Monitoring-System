import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  HEALTH_CHECK_QUERY,
  type HealthCheckHistoryPoint,
  type HealthCheckQuery,
} from '../../domain/ports/health-check-query.port';

import {
  HEALTH_CHECK_TARGET_REPOSITORY,
  type HealthCheckTargetRepository,
} from '../../domain/repositories/health-check-target.repository';

@Injectable()
export class QueryLatestHealthCheckUseCase {
  constructor(
    @Inject(HEALTH_CHECK_QUERY)
    private readonly healthCheckQuery: HealthCheckQuery,

    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly healthCheckTargetRepository: HealthCheckTargetRepository,
  ) {}

  async execute(
    healthCheckTargetId: string,
  ): Promise<HealthCheckHistoryPoint | null> {
    const target =
      await this.healthCheckTargetRepository.findById(healthCheckTargetId);

    if (!target) {
      throw new NotFoundException(
        `Health check target with ID ${healthCheckTargetId} not found`,
      );
    }

    return this.healthCheckQuery.queryLatest(healthCheckTargetId);
  }
}
