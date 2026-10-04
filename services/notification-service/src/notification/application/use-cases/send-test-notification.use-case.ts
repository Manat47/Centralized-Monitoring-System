import { randomUUID } from 'node:crypto';

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
import { NotificationExecutionRouter } from '../services/notification-execution.router';

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
    private readonly executionRouter: NotificationExecutionRouter,
    @Inject(AUDIT_EVENT_PUBLISHER)
    private readonly auditEventPublisher: AuditEventPublisher,
  ) {}

  async execute(
    input: SendTestNotificationInput,
  ): Promise<SendTestNotificationResult> {
    const delivery = await this.executionRouter.execute({
      alertId: randomUUID(),
      assetId: null,
      sourceId: 'notification-test',
      severity: 'WARNING',
      status: 'TRIGGERED',
      alertType: 'ENDPOINT_UNAVAILABLE',
      metricType: 'NOTIFICATION_TEST',
      title: 'Notification test',
      message: 'This is a test notification from Centralized Monitoring.',
      occurredAt: new Date(),
    });

    if (delivery.recipientCount === 0) {
      throw new BadRequestException('No notification recipients configured');
    }

    const result: SendTestNotificationResult = {
      recipientCount: delivery.recipientCount,
      sentCount: delivery.sentCount,
      failedCount: delivery.failedCount,
    };

    await this.auditEventPublisher.publish({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: 'NOTIFICATION_TEST_SENT',
      resourceType: 'NOTIFICATION_SETTINGS',
      resourceId: null,
      resourceName: 'Alert notification recipients',
      result:
        delivery.mode === 'fallback'
          ? delivery.sentCount > 0
            ? 'SUCCESS'
            : 'FAILURE'
          : delivery.failedCount === 0
            ? 'SUCCESS'
            : 'FAILURE',
      metadata: {
        recipientCount: result.recipientCount,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        mode: delivery.mode,
        channels: delivery.deliveries.map((attempt) => ({
          channel: attempt.recipient.channel,
          success: attempt.result.success,
          attempts: attempt.attempts,
        })),
      },
      errorCode:
        delivery.failedCount > 0 &&
        (delivery.mode === 'broadcast' || delivery.sentCount === 0)
          ? 'NOTIFICATION_TEST_PARTIAL_FAILURE'
          : null,
      errorMessage:
        delivery.failedCount > 0 &&
        (delivery.mode === 'broadcast' || delivery.sentCount === 0)
          ? `Failed to send to ${delivery.failedCount} of ${delivery.recipientCount} recipients`
          : null,
      occurredAt: new Date(),
    });

    if (delivery.sentCount === 0) {
      throw new ServiceUnavailableException(
        'Failed to send test notification to all recipients',
      );
    }

    return result;
  }
}
