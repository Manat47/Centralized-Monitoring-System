import {
  LogFindingBuffer,
  type LogFindingCandidate,
} from './log-finding-buffer';
import type { LogFindingStateRepository } from './log-finding-state.repository';
import type { PersistTransition } from './log-finding-state.repository';

const candidate: LogFindingCandidate = {
  candidateId: 'candidate-1',
  ruleId: 'rule-1',
  ruleName: 'Database errors',
  serviceName: 'billing',
  severity: 'high',
  safeMessage: 'Connection refused for user_id=1 at 10.0.0.1',
  projectId: 'project-1',
  threshold: 3,
  timeWindowSeconds: 60,
  cooldownMinutes: 1,
  occurredAt: '2026-10-05T00:00:00.000Z',
};

describe('LogFindingBuffer', () => {
  const persistTransition = jest
    .fn()
    .mockImplementation((input: { at: Date; candidate: LogFindingCandidate }) =>
      Promise.resolve({
        accepted: true,
        suppressedUntil: new Date(
          input.at.getTime() + input.candidate.cooldownMinutes * 60_000,
        ),
      }),
    );
  const states = { persistTransition } as unknown as LogFindingStateRepository;

  beforeEach(() => jest.clearAllMocks());

  it('flushes only on threshold and cooldown summary, not every hit', async () => {
    const buffer = new LogFindingBuffer(states);
    expect(await buffer.record(candidate, 100_000)).toBeNull();
    expect(await buffer.record(candidate, 100_000)).toBeNull();
    expect(
      await buffer.record({ ...candidate, candidateId: '2' }, 100_001),
    ).toBeNull();
    expect(persistTransition).not.toHaveBeenCalled();
    expect(
      await buffer.record({ ...candidate, candidateId: '3' }, 100_002),
    ).toBe('trigger');
    expect(persistTransition).toHaveBeenCalledTimes(1);
    expect(
      await buffer.record({ ...candidate, candidateId: '4' }, 100_003),
    ).toBeNull();
    expect(persistTransition).toHaveBeenCalledTimes(1);
    expect(
      await buffer.record({ ...candidate, candidateId: '5' }, 160_003),
    ).toBeNull();
    expect(persistTransition).toHaveBeenCalledTimes(1);
  });

  it('does not retain a candidate when the transition write fails', async () => {
    const buffer = new LogFindingBuffer(states);
    await buffer.record(candidate, 100_000);
    await buffer.record({ ...candidate, candidateId: '2' }, 100_001);
    persistTransition.mockRejectedValueOnce(new Error('DB unavailable'));
    await expect(
      buffer.record({ ...candidate, candidateId: '3' }, 100_002),
    ).rejects.toThrow('DB unavailable');
    expect(
      await buffer.record({ ...candidate, candidateId: '3' }, 100_002),
    ).toBe('trigger');
  });

  it('flushes a summary only when activity continues after cooldown', async () => {
    const buffer = new LogFindingBuffer(states);
    const wide = { ...candidate, timeWindowSeconds: 180 };
    await buffer.record(wide, 100_000);
    await buffer.record({ ...wide, candidateId: '2' }, 100_001);
    expect(await buffer.record({ ...wide, candidateId: '3' }, 100_002)).toBe(
      'trigger',
    );
    await buffer.record({ ...wide, candidateId: '4' }, 100_003);
    expect(await buffer.record({ ...wide, candidateId: '5' }, 160_003)).toBe(
      'summary',
    );
    expect(persistTransition).toHaveBeenCalledTimes(2);
    const secondCall = persistTransition.mock.calls[1] as [PersistTransition];
    expect(secondCall[0]).toMatchObject({
      kind: 'summary',
      matchCount: 2,
    });
  });

  it('expires hits outside the window', async () => {
    const buffer = new LogFindingBuffer(states);
    await buffer.record(candidate, 100_000);
    await buffer.record({ ...candidate, candidateId: '2' }, 100_001);
    await buffer.record({ ...candidate, candidateId: '3' }, 161_000);
    expect(persistTransition).not.toHaveBeenCalled();
  });
});
