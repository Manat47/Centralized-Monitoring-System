export interface SendNotificationInput {
    alertId: string;
    assetId: string;
    severity: 'WARNING' | 'CRITICAL';
    title: string;
    message: string;
    occurredAt: Date;
}
export interface NotificationSender {
    send(input: SendNotificationInput): Promise<void>;
}
export declare const NOTIFICATION_SENDER: unique symbol;
