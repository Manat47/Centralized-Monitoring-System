export interface HealthCheckResult {
  statusCode: number | null;
  responseTimeMs: number;
  checkedAt: Date;
  error: string | null;
}

export const HEALTH_CHECKER = Symbol('HEALTH_CHECKER');

export interface HealthChecker {
  check(url: string): Promise<HealthCheckResult>;
}
