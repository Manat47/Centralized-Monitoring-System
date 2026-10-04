import type {
  NotificationRoutingRepository,
  RoutingRecipient,
} from '../../domain/ports/notification-routing.repository';
import type {
  NotificationSenderPort,
  SendChannelNotificationInput,
} from '../../domain/ports/notification-sender.port';
import { NotificationExecutionRouter } from './notification-execution.router';

const alert: SendChannelNotificationInput['alert'] = {
  alertId: 'alert-1',
  assetId: null,
  sourceId: 'target-1',
  severity: 'WARNING',
  status: 'TRIGGERED',
  alertType: 'ENDPOINT_UNAVAILABLE',
  metricType: 'HTTP',
  title: 'Endpoint unavailable',
  message: 'Connection refused',
  occurredAt: new Date('2026-10-04T00:00:00.000Z'),
};

const recipient = (
  recipientId: string,
  channel: RoutingRecipient['channel'],
  priority: number | null,
): RoutingRecipient => ({
  recipientId,
  channel,
  name: recipientId,
  destination: recipientId,
  secretToken: null,
  priority,
});

describe('NotificationExecutionRouter', () => {
  const repository: jest.Mocked<NotificationRoutingRepository> = {
    getConfiguration: jest.fn(),
  };
  const email = { channel: 'email' as const, sendAlert: jest.fn() };
  const line = { channel: 'line' as const, sendAlert: jest.fn() };
  const slack = { channel: 'slack' as const, sendAlert: jest.fn() };
  const senders: NotificationSenderPort[] = [email, line, slack];
  const router = new NotificationExecutionRouter(repository, senders);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('broadcasts to every enabled recipient concurrently', async () => {
    let finishEmail:
      ((value: { success: true; isTransientError: false }) => void) | undefined;
    email.sendAlert.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishEmail = resolve;
        }),
    );
    line.sendAlert.mockResolvedValueOnce({
      success: true,
      isTransientError: false,
    });
    repository.getConfiguration.mockResolvedValue({
      isFallbackEnabled: false,
      recipients: [
        recipient('email-1', 'email', 2),
        recipient('line-1', 'line', 1),
      ],
    });

    const pending = router.execute(alert);
    await Promise.resolve();
    await Promise.resolve();
    expect(email.sendAlert).toHaveBeenCalledTimes(1);
    expect(line.sendAlert).toHaveBeenCalledTimes(1);
    finishEmail?.({ success: true, isTransientError: false });

    await expect(pending).resolves.toMatchObject({
      mode: 'broadcast',
      recipientCount: 2,
      sentCount: 2,
      failedCount: 0,
    });
  });

  it('settles broadcast failures without suppressing successful channels', async () => {
    repository.getConfiguration.mockResolvedValue({
      isFallbackEnabled: false,
      recipients: [
        recipient('email-1', 'email', null),
        recipient('line-1', 'line', null),
      ],
    });
    email.sendAlert.mockResolvedValueOnce({
      success: true,
      isTransientError: false,
    });
    line.sendAlert.mockRejectedValueOnce(new Error('Provider crashed'));

    await expect(router.execute(alert)).resolves.toMatchObject({
      mode: 'broadcast',
      recipientCount: 2,
      sentCount: 1,
      failedCount: 1,
    });
  });

  it('falls back in priority order after a permanent failure', async () => {
    repository.getConfiguration.mockResolvedValue({
      isFallbackEnabled: true,
      recipients: [
        recipient('slack-3', 'slack', 3),
        recipient('email-2', 'email', 2),
        recipient('line-1', 'line', 1),
      ],
    });
    line.sendAlert.mockResolvedValueOnce({
      success: false,
      isTransientError: false,
      errorMessage: 'HTTP 400',
    });
    email.sendAlert.mockResolvedValueOnce({
      success: true,
      isTransientError: false,
    });

    const result = await router.execute(alert);

    expect(result).toMatchObject({
      mode: 'fallback',
      recipientCount: 3,
      sentCount: 1,
      failedCount: 1,
    });
    expect(
      result.deliveries.map((delivery) => delivery.recipient.channel),
    ).toEqual(['line', 'email']);
    expect(line.sendAlert).toHaveBeenCalledTimes(1);
    expect(email.sendAlert).toHaveBeenCalledTimes(1);
    expect(slack.sendAlert).not.toHaveBeenCalled();
  });

  it('retries transient errors twice with bounded backoff, then falls back', async () => {
    jest.useFakeTimers();
    repository.getConfiguration.mockResolvedValue({
      isFallbackEnabled: true,
      recipients: [
        recipient('line-1', 'line', 1),
        recipient('email-2', 'email', 2),
      ],
    });
    line.sendAlert.mockResolvedValue({
      success: false,
      isTransientError: true,
    });
    email.sendAlert.mockResolvedValueOnce({
      success: true,
      isTransientError: false,
    });

    const pending = router.execute(alert);
    await jest.advanceTimersByTimeAsync(1500);
    const result = await pending;

    expect(line.sendAlert).toHaveBeenCalledTimes(3);
    expect(email.sendAlert).toHaveBeenCalledTimes(1);
    expect(result.deliveries[0].attempts).toBe(3);
    expect(result.sentCount).toBe(1);
  });

  it('reports total failure without silently succeeding', async () => {
    repository.getConfiguration.mockResolvedValue({
      isFallbackEnabled: true,
      recipients: [
        recipient('line-1', 'line', 1),
        recipient('email-2', 'email', 2),
      ],
    });
    line.sendAlert.mockResolvedValueOnce({
      success: false,
      isTransientError: false,
    });
    email.sendAlert.mockResolvedValueOnce({
      success: false,
      isTransientError: false,
    });

    await expect(router.execute(alert)).resolves.toMatchObject({
      recipientCount: 2,
      sentCount: 0,
      failedCount: 2,
    });
  });
});
