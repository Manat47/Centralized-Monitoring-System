import {
  LogFindingBuffer,
  type LogFindingCandidate,
} from './log-finding-buffer';

const candidate: LogFindingCandidate = {
  candidateId: 'candidate-1',
  ruleId: 'rule-1',
  serviceName: 'billing',
  fingerprint: 'fingerprint-1',
  threshold: 3,
  timeWindowSeconds: 60,
  cooldownMinutes: 15,
  occurredAt: '2026-10-05T00:00:00.000Z',
};

describe('LogFindingBuffer', () => {
  it('reaches threshold only after three unique candidates and suppresses repeats', () => {
    const buffer = new LogFindingBuffer();
    const logger = jest.spyOn(buffer['logger'], 'log').mockImplementation();
    buffer.record(candidate, 100_000);
    buffer.record(candidate, 100_000);
    buffer.record({ ...candidate, candidateId: 'candidate-2' }, 100_001);
    expect(logger).not.toHaveBeenCalled();
    buffer.record({ ...candidate, candidateId: 'candidate-3' }, 100_002);
    expect(logger).toHaveBeenCalledTimes(1);
    buffer.record({ ...candidate, candidateId: 'candidate-4' }, 100_003);
    expect(logger).toHaveBeenCalledTimes(1);
  });

  it('expires hits outside the rule window', () => {
    const buffer = new LogFindingBuffer();
    const logger = jest.spyOn(buffer['logger'], 'log').mockImplementation();
    buffer.record(candidate, 100_000);
    buffer.record({ ...candidate, candidateId: 'candidate-2' }, 100_001);
    buffer.record({ ...candidate, candidateId: 'candidate-3' }, 161_000);
    expect(logger).not.toHaveBeenCalled();
  });
});
