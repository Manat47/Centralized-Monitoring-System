import type {
  Alert,
  AlertSeverity,
  AlertStatus,
} from '../entities/alert.entity';

export interface FindAlertsFilters {
  status?: AlertStatus;
  severity?: AlertSeverity;
  assetId?: string;
  page?: number;
  limit?: number;
}

export interface FindAlertsResult {
  items: Alert[];
  total: number;
}

export const ALERT_REPOSITORY = Symbol('ALERT_REPOSITORY');

export interface AlertRepository {
  create(alert: Alert): Promise<Alert>;

  findActiveByRuleId(ruleId: string): Promise<Alert | null>;

  findAll(filters?: FindAlertsFilters): Promise<FindAlertsResult>;

  findById(alertId: string): Promise<Alert | null>;

  update(alert: Alert): Promise<Alert>;
}
