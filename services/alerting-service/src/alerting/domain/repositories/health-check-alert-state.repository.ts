import type { HealthCheckAlertState } from '../entities/health-check-alert-state.entity';

export const HEALTH_CHECK_ALERT_STATE_REPOSITORY = Symbol(
  'HEALTH_CHECK_ALERT_STATE_REPOSITORY',
);

export interface HealthCheckAlertStateRepository {
  findByTargetId(targetId: string): Promise<HealthCheckAlertState | null>;
  findStaleCandidates(now: Date): Promise<HealthCheckAlertState[]>;
  markStaleIfCurrent(state: HealthCheckAlertState): Promise<boolean>;
  disableByAssetId(assetId: string, occurredAt: Date): Promise<void>;
  save(state: HealthCheckAlertState): Promise<HealthCheckAlertState>;
}
