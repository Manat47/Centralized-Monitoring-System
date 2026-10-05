import type { ConfigService } from '@nestjs/config';
import { LogFindingEventPublisher } from './log-finding-event.publisher';
import type { LogFindingAlertEvent } from './log-finding-event';

const event: LogFindingAlertEvent = {
  eventId: 'event-1',
  eventType: 'log_finding_alert',
  severity: 'high',
  title: 'Database errors',
  service: 'billing',
  ruleId: 'rule-1',
  fingerprint: 'fingerprint-1',
  matchCount: 5,
  countOverflow: false,
  timeWindowSeconds: 60,
  snippet: 'Connection refused',
  deepLink: '/explorer',
  timestamp: '2026-10-05T00:00:00.000Z',
  isSummary: false,
};

describe('LogFindingEventPublisher', () => {
  it('publishes a Nest RMQ envelope to the notification exchange and waits for confirmation', async () => {
    const publish = jest.fn();
    const waitForConfirms = jest.fn().mockResolvedValue(undefined);
    const publisher = new LogFindingEventPublisher({} as ConfigService);
    Object.assign(publisher, { channel: { publish, waitForConfirms } });

    await publisher.publish(event);

    expect(publish).toHaveBeenCalledWith(
      'notification.events',
      'notification.log.finding',
      expect.any(Buffer),
      expect.objectContaining({ persistent: true, messageId: event.eventId }),
    );
    const calls = publish.mock.calls as Array<[string, string, Buffer, object]>;
    const body = JSON.parse(calls[0][2].toString()) as {
      pattern: string;
      data: LogFindingAlertEvent;
    };
    expect(body).toEqual({ pattern: 'notification.log.finding', data: event });
    expect(waitForConfirms).toHaveBeenCalledTimes(1);
  });
});
