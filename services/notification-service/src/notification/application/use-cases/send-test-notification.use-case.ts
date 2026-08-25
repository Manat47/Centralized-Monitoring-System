import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  AUDIT_EVENT_PUBLISHER,
  type AuditEventPublisher,
} from '../../domain/ports/audit-event-publisher.port';
import {
  NOTIFICATION_RECIPIENT_REPOSITORY,
  type NotificationRecipientRepository,
} from '../../domain/ports/notification-recipient.repository';
import {
  NOTIFICATION_SENDER,
  type NotificationSender,
} from '../../domain/ports/notification-sender.port';

export interface SendTestNotificationInput {
  actorUserId: string;
  actorRole: 'ADMIN' | 'OPERATOR';
  actorEmail?: string | null;
}

export interface SendTestNotificationResult {
  recipientCount: number;
  sentCount: number;
  failedCount: number;
}

@Injectable()
export class SendTestNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_RECIPIENT_REPOSITORY)
    private readonly notificationRecipientRepository: NotificationRecipientRepository,
    @Inject(NOTIFICATION_SENDER)
    private readonly notificationSender: NotificationSender,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(
    input: SendTestNotificationInput,
  ): Promise<SendTestNotificationResult> {
    const recipients = await this.notificationRecipientRepository.findAll();

    if (recipients.length === 0) {
      throw new BadRequestException('No notification recipients configured');
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        await this.notificationSender.sendTest(recipient.email);
        sentCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    const result: SendTestNotificationResult = {
      recipientCount: recipients.length,
      sentCount,
      failedCount,
    };

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: 'NOTIFICATION_TEST_SENT',
      resourceType: 'NOTIFICATION_SETTINGS',
      resourceId: null,
      resourceName: 'Alert notification recipients',
      result: failedCount === 0 ? 'SUCCESS' : 'FAILURE',
      metadata: {
        recipientCount: result.recipientCount,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
      },
      errorCode: failedCount > 0 ? 'NOTIFICATION_TEST_PARTIAL_FAILURE' : null,
      errorMessage:
        failedCount > 0
          ? `Failed to send to ${failedCount} of ${recipients.length} recipients`
          : null,
      occurredAt: new Date(),
    });

    if (sentCount === 0) {
      throw new ServiceUnavailableException(
        'Failed to send test notification to all recipients',
      );
    }

    return result;
  }
}
