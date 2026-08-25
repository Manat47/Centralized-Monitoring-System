import type {
  Alert,
  AlertSeverity,
  AlertStatus,
} from '../entities/alert.entity';
import type { AlertLifecycleEvent } from '../entities/alert-lifecycle-event';

export interface FindAlertsFilters {
  status?: AlertStatus;
  severity?: AlertSeverity;
  assetId?: string;
  sourceType?: 'METRIC_RULE' | 'HEALTH_CHECK';
  alertType?:
    | 'METRIC_THRESHOLD'
    | 'ENDPOINT_UNAVAILABLE'
    | 'HEALTH_CHECK_STALE';
  search?: string;

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

  findActiveByDedupKey(dedupKey: string): Promise<Alert | null>;

  findActiveBySource(sourceType: string, sourceId: string): Promise<Alert[]>;

  findActiveByAssetId(assetId: string): Promise<Alert[]>;

  findAll(filters?: FindAlertsFilters): Promise<FindAlertsResult>;

  findForReport(filters: FindAlertsForReportFilters): Promise<Alert[]>;

  findById(alertId: string): Promise<Alert | null>;

  update(alert: Alert): Promise<Alert>;

  appendLifecycleEvent(event: AlertLifecycleEvent): Promise<void>;

  findLifecycleEvents(alertId: string): Promise<AlertLifecycleEvent[]>;

  claimEvent(eventId: string): Promise<boolean>;

  releaseEvent(eventId: string): Promise<void>;
}
