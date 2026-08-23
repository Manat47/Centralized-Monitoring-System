export type NotificationResolutionReason =
  'METRIC_RECOVERED' | 'ASSET_DEACTIVATED';

interface NotificationEventBase {
  alertId: string;
  ruleId: string;
  assetId: string;
  metricType: string;
  severity: 'WARNING' | 'CRITICAL';
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

export interface NotificationEventPublisher {
  publish(event: NotificationEvent): Promise<void>;
}

export const NOTIFICATION_EVENT_PUBLISHER = Symbol(
  'NOTIFICATION_EVENT_PUBLISHER',
);
