export type NotificationSeverity = 'WARNING' | 'CRITICAL';

export type NotificationResolutionReason =
  | 'METRIC_RECOVERED'
  | 'HEALTH_CHECK_RECOVERED'
  | 'HEALTH_CHECK_DATA_STALE'
  | 'HEALTH_CHECK_DATA_RESUMED'
  | 'HEALTH_CHECK_TARGET_PAUSED'
  | 'HEALTH_CHECK_TARGET_ARCHIVED'
  | 'ASSET_DEACTIVATED';

interface NotificationEventBase {
  alertId: string;
  sourceType: 'METRIC_RULE' | 'HEALTH_CHECK';
  sourceId: string;
  alertType:
    | 'METRIC_THRESHOLD'
    | 'ENDPOINT_UNAVAILABLE'
    | 'HEALTH_CHECK_STALE';
  ruleId: string | null;
  assetId: string;
  metricType: string;
  severity: NotificationSeverity;
  message: string;
  occurredAt: string;
}

export type NotificationEvent =
  | (NotificationEventBase & {
      eventType: 'ALERT_TRIGGERED';
    })
  | (NotificationEventBase & {
      eventType: 'ALERT_RESOLVED';
      resolutionReason: NotificationResolutionReason;
    });
