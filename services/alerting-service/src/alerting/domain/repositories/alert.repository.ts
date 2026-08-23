import type {
  Alert,
  AlertSeverity,
  AlertStatus,
} from '../entities/alert.entity';

export interface FindAlertsFilters {
  status?: AlertStatus;
  severity?: AlertSeverity;
  assetId?: string;

  from?: Date;
  to?: Date;

  page?: number;
  limit?: number;
}

export interface FindAlertsResult {
  items: Alert[];
  total: number;
}
export interface FindAlertsForReportFilters {
  assetId?: string;
  from: Date;
  to: Date;
}

export const ALERT_REPOSITORY = Symbol('ALERT_REPOSITORY');

export interface AlertRepository {
  create(alert: Alert): Promise<Alert>;

  findActiveByRuleId(ruleId: string): Promise<Alert | null>;

  findActiveByAssetId(assetId: string): Promise<Alert[]>;

  findAll(filters?: FindAlertsFilters): Promise<FindAlertsResult>;

  findForReport(filters: FindAlertsForReportFilters): Promise<Alert[]>;

  findById(alertId: string): Promise<Alert | null>;

  update(alert: Alert): Promise<Alert>;
}
