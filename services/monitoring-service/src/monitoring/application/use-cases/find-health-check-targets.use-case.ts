import { Inject, Injectable } from '@nestjs/common';

import {
  HEALTH_CHECK_TARGET_REPOSITORY,
  type HealthCheckTargetRepository,
} from '../../domain/repositories/health-check-target.repository';
import {
  HEALTH_CHECK_QUERY,
  type HealthCheckQuery,
} from '../../domain/ports/health-check-query.port';

@Injectable()
export class FindHealthCheckTargetsUseCase {
  constructor(
    @Inject(HEALTH_CHECK_TARGET_REPOSITORY)
    private readonly repository: HealthCheckTargetRepository,
    @Inject(HEALTH_CHECK_QUERY)
    private readonly healthCheckQuery: HealthCheckQuery,
  ) {}

  async execute() {
    const targets = await this.repository.findAll();
    const latestByTargetId = await this.healthCheckQuery.queryLatestMany(
      targets.map((target) => target.toObject().healthCheckTargetId),
    );

    return targets.map((target) => {
      const data = target.toObject();

      return {
        ...data,
        latest: latestByTargetId.get(data.healthCheckTargetId) ?? null,
      };
    });
  }
}
