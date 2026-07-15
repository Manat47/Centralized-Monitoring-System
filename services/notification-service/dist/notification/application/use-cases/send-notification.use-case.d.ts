import type { NotificationEvent } from '../contracts/notification-event.contract';
import { type NotificationSender } from '../../domain/ports/notification-sender.port';
export declare class SendNotificationUseCase {
    private readonly notificationSender;
    constructor(notificationSender: NotificationSender);
    execute(event: NotificationEvent): Promise<void>;
}
