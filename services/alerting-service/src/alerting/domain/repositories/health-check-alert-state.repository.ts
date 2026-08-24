import type { HealthCheckAlertState } from '../entities/health-check-alert-state.entity';

export const HEALTH_CHECK_ALERT_STATE_REPOSITORY = Symbol(
  'HEALTH_CHECK_ALERT_STATE_REPOSITORY',
);

export interface HealthCheckAlertStateRepository {
  findByTargetId(targetId: string): Promise<HealthCheckAlertState | null>;
  findStaleCandidates(now: Date): Promise<HealthCheckAlertState[]>;
  save(state: HealthCheckAlertState): Promise<HealthCheckAlertState>;
}
