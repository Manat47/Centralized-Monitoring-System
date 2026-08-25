export interface HealthCheckHistoryPoint {
  timestamp: Date;
  statusCode: number | null;
  responseTimeMs: number;
  error: string | null;
}

export interface QueryHealthCheckHistoryInput {
  healthCheckTargetId: string;
  start: Date;
  end: Date;
}

export const HEALTH_CHECK_QUERY = Symbol('HEALTH_CHECK_QUERY');

export interface HealthCheckQuery {
  queryHistory(
    input: QueryHealthCheckHistoryInput,
  ): Promise<HealthCheckHistoryPoint[]>;

  queryLatest(
    healthCheckTargetId: string,
  ): Promise<HealthCheckHistoryPoint | null>;

  queryLatestMany(
    healthCheckTargetIds: string[],
  ): Promise<Map<string, HealthCheckHistoryPoint>>;
}
