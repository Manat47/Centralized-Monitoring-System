import { BadRequestException, Injectable } from '@nestjs/common';

import { QueryHealthCheckHistoryUseCase } from './query-health-check-history.use-case';
import type { HealthCheckHistoryPoint } from '../../domain/ports/health-check-query.port';

export interface QueryHealthReportSummaryInput {
  healthCheckTargetId: string;
  start: Date;
  end: Date;
}

export interface HealthReportSummary {
  healthCheckTargetId: string;

  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;

  failedHttpChecks: number;
  noResponseChecks: number;

  availabilityPercent: number | null;

  responseTime: {
    averageMs: number | null;
    maxMs: number | null;
    p95Ms: number | null;
  };

  statusCodes: Record<string, number>;
}

@Injectable()
export class QueryHealthReportSummaryUseCase {
  constructor(
    private readonly queryHealthCheckHistoryUseCase: QueryHealthCheckHistoryUseCase,
  ) {}

  async execute(
    input: QueryHealthReportSummaryInput,
  ): Promise<HealthReportSummary> {
    if (input.start >= input.end) {
      throw new BadRequestException('Start time must be before end time');
    }

    const points = await this.queryHealthCheckHistoryUseCase.execute({
      healthCheckTargetId: input.healthCheckTargetId,
      start: input.start,
      end: input.end,
    });

    const successfulPoints = points.filter(
      (point) =>
        point.statusCode !== null &&
        point.statusCode >= 200 &&
        point.statusCode < 300,
    );

    const failedPoints = points.filter(
      (point) =>
        point.statusCode === null ||
        point.statusCode < 200 ||
        point.statusCode >= 300,
    );

    const failedHttpPoints = failedPoints.filter(
      (point) => point.statusCode !== null,
    );

    const noResponsePoints = failedPoints.filter(
      (point) => point.statusCode === null,
    );

    const responseTimes = successfulPoints.map((point) => point.responseTimeMs);

    const availabilityPercent =
      points.length > 0
        ? this.round((successfulPoints.length / points.length) * 100)
        : null;

    return {
      healthCheckTargetId: input.healthCheckTargetId,

      totalChecks: points.length,
      successfulChecks: successfulPoints.length,
      failedChecks: failedPoints.length,

      failedHttpChecks: failedHttpPoints.length,
      noResponseChecks: noResponsePoints.length,

      availabilityPercent,

      responseTime: {
        averageMs: this.averageOrNull(responseTimes),
        maxMs: this.maxOrNull(responseTimes),
        p95Ms: this.percentile95(responseTimes),
      },

      statusCodes: this.summarizeStatusCodes(points),
    };
  }

  private summarizeStatusCodes(
    points: HealthCheckHistoryPoint[],
  ): Record<string, number> {
    const result: Record<string, number> = {};

    for (const point of points) {
      if (point.statusCode === null) {
        continue;
      }

      const key = String(point.statusCode);

      result[key] = (result[key] ?? 0) + 1;
    }

    return result;
  }

  private averageOrNull(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    const total = values.reduce((sum, value) => sum + value, 0);

    return this.round(total / values.length);
  }

  private maxOrNull(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    return this.round(Math.max(...values));
  }

  private percentile95(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);

    const index = Math.ceil(sorted.length * 0.95) - 1;

    return this.round(sorted[index] ?? sorted[sorted.length - 1]);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
