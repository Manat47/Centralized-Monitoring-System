import { normalizeLogEvent } from './log-event-normalizer.service';

describe('generic log contract', () => {
  const now = new Date('2026-09-30T10:42:30Z');

  it('keeps arbitrary nested customer data while indexing only declared standard fields', () => {
    const raw = {
      source: 'payment_gateway',
      event_type: 'provider_timeout',
      context: { provider: 'example', attempts: [1, 2] },
      metadata: { status: 'ok' },
      severity: 'warn',
    };
    const event = normalizeLogEvent(raw, 0, now);
    expect(event.rawPayload).toEqual(raw);
    expect(event.severity).toBe('WARN');
    expect(event.message).toBeUndefined();
    expect(event.receivedAt).toBe(now.toISOString());
    expect(event.timeSource).toBe('received');
  });

  it('does not infer login, outcome or source from an event name', () => {
    const event = normalizeLogEvent(
      { source: 'portal', event_type: 'signup', metadata: { status: 'ok' } },
      0,
      now,
    );
    expect(event.event_type).toBe('signup');
    expect(event.source).toBe('portal');
    expect(event.rawPayload.metadata).toEqual({ status: 'ok' });
    expect(event).not.toHaveProperty('kind');
    expect(event).not.toHaveProperty('message');
  });

  it('accepts legacy lowercase warning severity as WARN', () => {
    expect(
      normalizeLogEvent(
        { source: 'x', event_type: 'y', severity: 'warning' },
        0,
        now,
      ).severity,
    ).toBe('WARN');
  });

  it('reports the invalid batch position and field', () => {
    expect(() => normalizeLogEvent({ event_type: 'signup' }, 3, now)).toThrow(
      'events[3].source',
    );
    expect(() =>
      normalizeLogEvent(
        { source: 'portal', event_type: 'signup', client: { ip: 'bad-ip' } },
        2,
        now,
      ),
    ).toThrow('events[2].client.ip');
  });

  it('rejects overly deep JSON', () => {
    const raw: Record<string, unknown> = { source: 'x', event_type: 'y' };
    let nested: Record<string, unknown> = raw;
    for (let i = 0; i < 9; i++) {
      nested.child = {};
      nested = nested.child as Record<string, unknown>;
    }
    expect(() => normalizeLogEvent(raw, 0, now)).toThrow('depth');
  });
});
