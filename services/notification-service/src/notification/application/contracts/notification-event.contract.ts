export type NotificationSeverity = 'WARNING' | 'CRITICAL';

export type NotificationResolutionReason =
  'METRIC_RECOVERED' | 'ASSET_DEACTIVATED';

interface NotificationEventBase {
  alertId: string;
  ruleId: string;
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
