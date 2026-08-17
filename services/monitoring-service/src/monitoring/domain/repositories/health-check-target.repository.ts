import type { HealthCheckTarget } from '../entities/health-check-target.entity';

export const HEALTH_CHECK_TARGET_REPOSITORY = Symbol(
  'HEALTH_CHECK_TARGET_REPOSITORY',
);

export interface HealthCheckTargetRepository {
  create(target: HealthCheckTarget): Promise<HealthCheckTarget>;

  findById(healthCheckTargetId: string): Promise<HealthCheckTarget | null>;

  findAll(): Promise<HealthCheckTarget[]>;

  findAllByAssetId(assetId: string): Promise<HealthCheckTarget[]>;

  findEnabled(): Promise<HealthCheckTarget[]>;

  update(target: HealthCheckTarget): Promise<HealthCheckTarget>;
}
