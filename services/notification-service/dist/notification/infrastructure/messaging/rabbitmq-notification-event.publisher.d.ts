import { ClientProxy } from '@nestjs/microservices';
import { type NotificationEvent, type NotificationEventPublisher } from '../../domain/ports/notification-event-publisher.port';
export declare const NOTIFICATION_EVENTS_CLIENT: unique symbol;
export declare const NOTIFICATION_EVENT_PATTERN = "notification.alert.changed";
export declare class RabbitMqNotificationEventPublisher implements NotificationEventPublisher {
    private readonly client;
    constructor(client: ClientProxy);
    publish(event: NotificationEvent): Promise<void>;
}
