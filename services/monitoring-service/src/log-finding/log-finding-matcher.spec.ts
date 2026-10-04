import { matchLogFinding, type LogFindingRule } from './log-finding-matcher';

const rule: LogFindingRule = {
  id: 'rule-1',
  name: 'Database error',
  serviceName: 'billing',
  searchQuery: 'connection refused',
  severity: 'high',
  threshold: 3,
  timeWindowSeconds: 60,
  cooldownMinutes: 15,
};

const log = {
  eventId: 'event-1',
  source: 'billing',
  event_type: 'request_failed',
  message: 'Connection REFUSED: password=secret',
  timestamp: '2026-10-05T00:00:00.000Z',
};

describe('matchLogFinding', () => {
  it('matches a literal keyword and publishes metadata without raw message', () => {
    const result = matchLogFinding(rule, log, 'project-1');
    expect(result).toMatchObject({
      ruleId: rule.id,
      sourceEventId: log.eventId,
    });
    expect(JSON.stringify(result)).not.toContain('password=secret');
  });

  it('filters by service and isolates project fingerprints', () => {
    expect(
      matchLogFinding({ ...rule, serviceName: 'auth' }, log, 'project-1'),
    ).toBeNull();
    expect(matchLogFinding(rule, log, 'project-1')?.fingerprint).not.toBe(
      matchLogFinding(rule, log, 'project-2')?.fingerprint,
    );
  });

  it('matches status code and explicit regex while rejecting invalid regex', () => {
    expect(
      matchLogFinding(
        { ...rule, searchQuery: '500' },
        { ...log, status_code: 500 },
        'p',
      ),
    ).not.toBeNull();
    expect(
      matchLogFinding(
        { ...rule, searchQuery: 'regex:connection\\s+refused' },
        log,
        'p',
      ),
    ).not.toBeNull();
    expect(
      matchLogFinding({ ...rule, searchQuery: 'regex:[' }, log, 'p'),
    ).toBeNull();
  });
});
