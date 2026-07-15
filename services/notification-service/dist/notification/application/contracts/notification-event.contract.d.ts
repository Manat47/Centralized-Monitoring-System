export type NotificationEventType = 'ALERT_TRIGGERED' | 'ALERT_RESOLVED';
export type NotificationSeverity = 'WARNING' | 'CRITICAL';
export interface NotificationEvent {
    eventType: NotificationEventType;
    alertId: string;
    ruleId: string;
    assetId: string;
    metricType: string;
    severity: NotificationSeverity;
    message: string;
    occurredAt: string;
}
