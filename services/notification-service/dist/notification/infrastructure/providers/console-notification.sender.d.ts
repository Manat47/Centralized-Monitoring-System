import type { NotificationSender, SendNotificationInput } from '../../domain/ports/notification-sender.port';
export declare class ConsoleNotificationSender implements NotificationSender {
    private readonly logger;
    send(input: SendNotificationInput): Promise<void>;
}
