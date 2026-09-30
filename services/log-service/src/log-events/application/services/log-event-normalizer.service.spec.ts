import {
  normalizeLogEvent,
  LogInputError,
} from './log-event-normalizer.service';

describe('normalizeLogEvent', () => {
  const now = new Date('2026-09-30T10:42:30Z');

  it('normalizes the activity payload while keeping client ID separate from server ID', () => {
    const event = normalizeLogEvent(
      {
        event_id: 'evt_987654321',
        event_type: 'auth.login',
        user_id: 'usr_10293',
        client: { ip: '203.0.113.195', device_type: 'Desktop' },
        metrics: { duration_ms: 1420 },
        tags: ['auth'],
        metadata: { status: 'success', session_id: 'sess_abc123' },
      },
      0,
      now,
    );
    expect(event.kind).toBe('ACTIVITY');
    expect(event.eventId).not.toBe('evt_987654321');
    expect(event.externalEventId).toBe('evt_987654321');
    expect(event.receivedAt).toBe(now.toISOString());
    expect(event.duration_ms).toBe(1420);
    expect(event.source).toBe('auth');
  });

  it('keeps the legacy application event contract', () => {
    const event = normalizeLogEvent(
      { source: 'payments', event_type: 'failed', message: 'Gateway timeout' },
      0,
      now,
    );
    expect(event.kind).toBe('APPLICATION');
    expect(event.timestamp).toBe(now.toISOString());
  });

  it('reports the failing batch position for nested input', () => {
    expect(() =>
      normalizeLogEvent(
        { event_type: 'auth.login', client: { ip: 'not-an-ip' } },
        3,
        now,
      ),
    ).toThrow('events[3].client.ip');
    expect(() =>
      normalizeLogEvent(
        { event_type: 'auth.login', metadata: { nested: { forbidden: true } } },
        2,
        now,
      ),
    ).toThrow(LogInputError);
  });
});
