import {
  fingerprintFor,
  normalizeMessage,
  sanitizeLogMessage,
  truncateSnippet,
} from './log-finding-sanitizer';

describe('log finding sanitizer', () => {
  it('redacts tokens, secrets and basic PII', () => {
    const value =
      'Bearer abc123 password=topsecret api_key=xyz user@example.com 192.168.1.2 1234567890123';
    const result = sanitizeLogMessage(value);
    expect(result).toContain('[REDACTED_TOKEN]');
    expect(result).toContain('password=[REDACTED]');
    expect(result).toContain('api_key=[REDACTED]');
    expect(result).not.toContain('topsecret');
    expect(result).not.toContain('user@example.com');
    expect(result).not.toContain('192.168.1.2');
    expect(result).not.toContain('1234567890123');
    expect(
      sanitizeLogMessage('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature'),
    ).toBe('[REDACTED_TOKEN]');
    expect(sanitizeLogMessage('{"password":"hidden"}')).not.toContain('hidden');
    expect(sanitizeLogMessage('key=private access_token=abc')).toBe(
      'key=[REDACTED] access_token=[REDACTED]',
    );
  });

  it('limits snippets to five lines and 500 characters', () => {
    expect(
      truncateSnippet(Array(10).fill('line').join('\n')).split('\n'),
    ).toHaveLength(5);
    expect(truncateSnippet('x'.repeat(1000))).toHaveLength(500);
  });

  it('groups dynamic user IDs and timestamps under the same fingerprint', () => {
    const a = '2026-10-05T00:00:00Z Login failed for user_id=123 from 10.0.0.1';
    const b = '2026-10-05T00:01:00Z Login failed for user_id=456 from 10.0.0.2';
    expect(normalizeMessage(a)).toBe(normalizeMessage(b));
    expect(fingerprintFor('rule-1', 'auth', a)).toBe(
      fingerprintFor('rule-1', 'auth', b),
    );
    expect(fingerprintFor('rule-2', 'auth', a)).not.toBe(
      fingerprintFor('rule-1', 'auth', a),
    );
  });
});
