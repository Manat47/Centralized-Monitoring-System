import { RmqContext } from '@nestjs/microservices';
import type { NotificationEvent } from '../../application/contracts/notification-event.contract';
import { SendNotificationUseCase } from '../../application/use-cases/send-notification.use-case';
export declare const NOTIFICATION_EVENT_PATTERN = "notification.alert.changed";
export declare class NotificationEventConsumer {
    private readonly sendNotificationUseCase;
    constructor(sendNotificationUseCase: SendNotificationUseCase);
    handle(event: NotificationEvent, context: RmqContext): Promise<void>;
}
