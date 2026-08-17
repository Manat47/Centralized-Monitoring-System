import type { HealthCheckResult } from './health-checker.port';

export interface StoreHealthCheckResultInput {
  healthCheckTargetId: string;
  assetId: string;
  result: HealthCheckResult;
}

export const HEALTH_CHECK_STORAGE = Symbol('HEALTH_CHECK_STORAGE');

export interface HealthCheckStorage {
  writeResult(input: StoreHealthCheckResultInput): Promise<void>;
}
