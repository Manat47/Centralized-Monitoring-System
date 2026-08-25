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
import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';

export interface UpdateNotificationRecipientsInput {
  emails: string[];
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
  actorEmail?: string | null;
}

@Injectable()
export class UpdateNotificationRecipientsUseCase {
  constructor(
    @Inject(NOTIFICATION_RECIPIENT_REPOSITORY)
    private readonly notificationRecipientRepository: NotificationRecipientRepository,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
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

    const previousEmails = new Set(
      existingRecipients.map((recipient) => recipient.email),
    );
    const nextEmails = new Set(normalizedEmails);
    const added = normalizedEmails.filter((email) => !previousEmails.has(email));
    const removed = [...previousEmails].filter((email) => !nextEmails.has(email));

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: 'NOTIFICATION_RECIPIENTS_UPDATED',
      resourceType: 'NOTIFICATION_SETTINGS',
      resourceId: null,
      resourceName: 'Alert notification recipients',
      result: 'SUCCESS',
      metadata: {
        added,
        removed,
        recipientCount: normalizedEmails.length,
      },
      occurredAt: new Date(),
    });

    return recipients.map((recipient) => recipient.toObject());
  }
}
