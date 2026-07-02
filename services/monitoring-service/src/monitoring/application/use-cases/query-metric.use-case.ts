import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  METRICS_QUERY,
  type MetricDataPoint,
  type MetricsQuery,
} from '../../domain/ports/metrics-query.port';

export interface QueryMetricCommand {
  assetId: string;
  measurement: string;
  start: Date;
  end: Date;
}

@Injectable()
export class QueryMetricUseCase {
  constructor(
    @Inject(METRICS_QUERY)
    private readonly metricsQuery: MetricsQuery,
  ) {}

  async execute(input: QueryMetricCommand): Promise<MetricDataPoint[]> {
    if (input.start >= input.end) {
      throw new BadRequestException('Start time must be before end time');
    }

    return this.metricsQuery.queryMetric(input);
  }
}
