import { NotificationRecipient } from '../entities/notification-recipient.entity';

export interface NotificationRecipientRepository {
  findAll(): Promise<NotificationRecipient[]>;

  replaceAll(recipients: NotificationRecipient[]): Promise<void>;
}

export const NOTIFICATION_RECIPIENT_REPOSITORY = Symbol(
  'NOTIFICATION_RECIPIENT_REPOSITORY',
);
