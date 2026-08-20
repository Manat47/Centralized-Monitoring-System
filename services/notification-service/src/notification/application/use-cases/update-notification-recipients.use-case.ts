import { randomUUID } from 'node:crypto';

import { Inject, Injectable, BadRequestException } from '@nestjs/common';

import {
  NotificationRecipient,
  type NotificationRecipientProps,
} from '../../domain/entities/notification-recipient.entity';
import {
  NOTIFICATION_RECIPIENT_REPOSITORY,
  type NotificationRecipientRepository,
} from '../../domain/ports/notification-recipient.repository';

export interface UpdateNotificationRecipientsInput {
  emails: string[];
}

@Injectable()
export class UpdateNotificationRecipientsUseCase {
  constructor(
    @Inject(NOTIFICATION_RECIPIENT_REPOSITORY)
    private readonly notificationRecipientRepository: NotificationRecipientRepository,
  ) {}

  async execute(
    input: UpdateNotificationRecipientsInput,
  ): Promise<NotificationRecipientProps[]> {
    const normalizedEmails = input.emails.map((email) =>
      email.trim().toLowerCase(),
    );

    const uniqueEmails = new Set(normalizedEmails);

    if (uniqueEmails.size !== normalizedEmails.length) {
      throw new BadRequestException('Duplicate notification recipient email');
    }

    const existingRecipients =
      await this.notificationRecipientRepository.findAll();

    const existingByEmail = new Map(
      existingRecipients.map((recipient) => [recipient.email, recipient]),
    );

    const recipients = normalizedEmails.map((email) => {
      const existing = existingByEmail.get(email);

      if (existing) {
        return existing;
      }

      return NotificationRecipient.create({
        recipientId: randomUUID(),
        email,
      });
    });

    await this.notificationRecipientRepository.replaceAll(recipients);

    return recipients.map((recipient) => recipient.toObject());
  }
}
