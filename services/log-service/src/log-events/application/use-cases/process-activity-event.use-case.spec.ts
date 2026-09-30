import { ProcessActivityEventUseCase } from './process-activity-event.use-case';
import type { ActivityRepository } from '../../domain/repositories/activity.repository';
import type { StoredLog } from '../../domain/entities/log-event.entity';

describe('ProcessActivityEventUseCase', () => {
  const receivedAt = '2026-09-30T10:42:30Z';
  const event: StoredLog = {
    eventId: 'event-1',
    kind: 'ACTIVITY',
    receivedAt,
    timestamp: receivedAt,
    source: 'auth',
    event_type: 'auth.login',
    message: 'Login failed',
    user_id: 'user-1',
    client: { ip: '203.0.113.195' },
    metadata: { status: 'failed' },
  };
  const rule = {
    ruleId: 'rule-1',
    projectId: 'project-1',
    name: 'Failed login',
    eventType: 'auth.login',
    conditionField: 'metadata.status',
    conditionValue: 'failed',
    groupBy: 'client.ip' as const,
    threshold: 5,
    windowMinutes: 10,
    enabled: true,
    activatedAt: '2026-09-30T10:40:00Z',
    createdAt: '2026-09-30T10:40:00Z',
    updatedAt: '2026-09-30T10:40:00Z',
  };
  const activeRules = jest.fn().mockResolvedValue([rule]);
  const process = jest.fn().mockResolvedValue(undefined);
  const repository = { activeRules, process } as unknown as ActivityRepository;
  const useCase = new ProcessActivityEventUseCase(repository);

  beforeEach(() => jest.clearAllMocks());

  it('passes a near-real-time match grouped by client IP', async () => {
    await useCase.execute('project-1', event);
    expect(process).toHaveBeenCalledWith('project-1', event, [
      { rule, groupValue: '203.0.113.195' },
    ]);
  });

  it('indexes a historical event without producing a finding', async () => {
    await useCase.execute('project-1', {
      ...event,
      timestamp: '2026-09-29T10:42:30Z',
    });
    expect(process).toHaveBeenCalledWith('project-1', expect.anything(), []);
  });

  it('does not apply a rule created after the event was received', async () => {
    activeRules.mockResolvedValueOnce([
      { ...rule, activatedAt: '2026-09-30T10:43:00Z' },
    ]);
    await useCase.execute('project-1', event);
    expect(process).toHaveBeenCalledWith('project-1', event, []);
  });
});
