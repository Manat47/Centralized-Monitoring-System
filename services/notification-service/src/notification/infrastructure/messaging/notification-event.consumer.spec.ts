import type { RmqContext } from '@nestjs/microservices';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';

import type { NotificationEvent } from '../../application/contracts/notification-event.contract';
import type { SendNotificationUseCase } from '../../application/use-cases/send-notification.use-case';
import type { SendUserInvitationUseCase } from '../../application/use-cases/send-user-invitation.use-case';
import {
  NOTIFICATION_DEAD_LETTER_QUEUE,
  NotificationEventConsumer,
} from './notification-event.consumer';

const event: NotificationEvent = {
  eventType: 'ALERT_TRIGGERED',
  alertId: 'alert-1',
  sourceType: 'HEALTH_CHECK',
  sourceId: 'target-1',
  alertType: 'ENDPOINT_UNAVAILABLE',
  ruleId: null,
  assetId: null,
  metricType: 'HTTP',
  severity: 'WARNING',
  message: 'Connection refused',
  occurredAt: '2026-10-04T00:00:00.000Z',
};

describe('NotificationEventConsumer', () => {
  const executeMock = jest.fn();
  const sendNotification = {
    execute: executeMock,
  } as unknown as jest.Mocked<SendNotificationUseCase>;
  const sendInvitation = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<SendUserInvitationUseCase>;
  const ack = jest.fn();
  const assertQueue = jest.fn().mockResolvedValue({});
  const sendToQueue = jest.fn().mockReturnValue(true);
  const waitForConfirms = jest.fn().mockResolvedValue(undefined);
  const channel = {
    ack,
    assertQueue,
    sendToQueue,
    waitForConfirms,
  } as unknown as jest.Mocked<ConfirmChannel>;
  const message = {
    content: Buffer.from('{"pattern":"notification.alert.changed","data":{}}'),
    properties: { contentType: 'application/json', headers: {} },
  } as ConsumeMessage;
  const context = {
    getChannelRef: () => channel,
    getMessage: () => message,
  } as unknown as RmqContext;
  const consumer = new NotificationEventConsumer(
    sendNotification,
    sendInvitation,
  );

  beforeEach(() => jest.clearAllMocks());

  it('acknowledges an alert after at least one channel succeeds', async () => {
    sendNotification.execute.mockResolvedValue({
      mode: 'broadcast',
      recipientCount: 2,
      sentCount: 1,
      failedCount: 1,
      deliveries: [],
    });

    await consumer.handle(event, context);

    expect(ack).toHaveBeenCalledWith(message);
    expect(waitForConfirms).not.toHaveBeenCalled();
    expect(sendToQueue).not.toHaveBeenCalled();
  });

  it('persists the original RabbitMQ message in the DLQ before acknowledging total failure', async () => {
    sendNotification.execute.mockResolvedValue({
      mode: 'fallback',
      recipientCount: 2,
      sentCount: 0,
      failedCount: 2,
      deliveries: [],
    });

    await consumer.handle(event, context);

    expect(assertQueue).toHaveBeenCalledWith(NOTIFICATION_DEAD_LETTER_QUEUE, {
      durable: true,
    });
    expect(sendToQueue).toHaveBeenCalledWith(
      NOTIFICATION_DEAD_LETTER_QUEUE,
      message.content,
      expect.objectContaining({
        persistent: true,
        headers: { 'x-notification-failure': 'ALL_CHANNELS_FAILED' },
      }),
    );
    expect(ack).toHaveBeenCalledWith(message);
    expect(waitForConfirms).toHaveBeenCalledTimes(1);
    expect(sendToQueue.mock.invocationCallOrder[0]).toBeLessThan(
      waitForConfirms.mock.invocationCallOrder[0],
    );
    expect(waitForConfirms.mock.invocationCallOrder[0]).toBeLessThan(
      ack.mock.invocationCallOrder[0],
    );
  });

  it('does not acknowledge if declaring the DLQ fails', async () => {
    sendNotification.execute.mockResolvedValue({
      mode: 'fallback',
      recipientCount: 0,
      sentCount: 0,
      failedCount: 0,
      deliveries: [],
    });
    assertQueue.mockRejectedValueOnce(new Error('RabbitMQ unavailable'));

    await expect(consumer.handle(event, context)).rejects.toThrow(
      'RabbitMQ unavailable',
    );
    expect(ack).not.toHaveBeenCalled();
  });

  it('does not acknowledge before RabbitMQ confirms the DLQ publish', async () => {
    executeMock.mockResolvedValue({
      mode: 'fallback',
      recipientCount: 1,
      sentCount: 0,
      failedCount: 1,
      deliveries: [],
    });
    waitForConfirms.mockRejectedValueOnce(new Error('Publish not confirmed'));

    await expect(consumer.handle(event, context)).rejects.toThrow(
      'Publish not confirmed',
    );
    expect(sendToQueue).toHaveBeenCalledTimes(1);
    expect(ack).not.toHaveBeenCalled();
  });
});
