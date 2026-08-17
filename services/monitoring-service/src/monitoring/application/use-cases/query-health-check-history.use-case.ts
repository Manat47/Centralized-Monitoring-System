import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  HEALTH_CHECK_QUERY,
  type HealthCheckHistoryPoint,
  type HealthCheckQuery,
} from '../../domain/ports/health-check-query.port';

export interface QueryHealthCheckHistoryInput {
  healthCheckTargetId: string;
  start: Date;
  end: Date;
}

@Injectable()
export class QueryHealthCheckHistoryUseCase {
  constructor(
    @Inject(HEALTH_CHECK_QUERY)
    private readonly healthCheckQuery: HealthCheckQuery,
  ) {}

  async execute(
    input: QueryHealthCheckHistoryInput,
  ): Promise<HealthCheckHistoryPoint[]> {
    if (input.start >= input.end) {
      throw new BadRequestException('Start time must be before end time');
    }

    return this.healthCheckQuery.queryHistory({
      healthCheckTargetId: input.healthCheckTargetId,
      start: input.start,
      end: input.end,
    });
  }
}
