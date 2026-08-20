import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_RECIPIENT_REPOSITORY,
  type NotificationRecipientRepository,
} from '../../domain/ports/notification-recipient.repository';

export interface NotificationRecipientResult {
  recipientId: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ListNotificationRecipientsUseCase {
  constructor(
    @Inject(NOTIFICATION_RECIPIENT_REPOSITORY)
    private readonly notificationRecipientRepository: NotificationRecipientRepository,
  ) {}

  async execute(): Promise<NotificationRecipientResult[]> {
    const recipients = await this.notificationRecipientRepository.findAll();

    return recipients.map((recipient) => recipient.toObject());
  }
}
