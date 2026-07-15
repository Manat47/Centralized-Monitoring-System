export type NotificationEventType = 'ALERT_TRIGGERED' | 'ALERT_RESOLVED';
export interface NotificationEvent {
    eventType: NotificationEventType;
    alertId: string;
    ruleId: string;
    assetId: string;
    metricType: string;
    severity: 'WARNING' | 'CRITICAL';
    message: string;
    occurredAt: string;
}
export interface NotificationEventPublisher {
    publish(event: NotificationEvent): Promise<void>;
}
export declare const NOTIFICATION_EVENT_PUBLISHER: unique symbol;
