import { ProcessActivityEventUseCase } from './process-activity-event.use-case';
import type { ActivityRepository } from '../../domain/repositories/activity.repository';
import type { StoredLog } from '../../domain/entities/log-event.entity';
import type { ActivityRule } from '../../domain/entities/activity-rule.entity';

describe('record detection', () => {
  const event: StoredLog = {
    eventId: 'event-1',
    requestId: 'request-1',
    tokenId: 'token-1',
    source: 'payment_gateway',
    event_type: 'provider_timeout',
    timestamp: '2026-09-30T10:42:30Z',
    receivedAt: '2026-09-30T10:42:30Z',
    timeSource: 'client',
    severity: 'ERROR',
    client: { ip: '203.0.113.195' },
    rawPayload: { source: 'payment_gateway', event_type: 'provider_timeout' },
  };
  const rule: ActivityRule = {
    ruleId: 'rule-1',
    projectId: 'project-1',
    name: 'Timeouts',
    eventType: 'provider_timeout',
    conditionField: 'severity',
    conditionValue: 'ERROR',
    groupBy: 'client.ip',
    threshold: 5,
    windowMinutes: 10,
    enabled: true,
    activatedAt: '2026-09-30T10:40:00Z',
    createdAt: '2026-09-30T10:40:00Z',
    updatedAt: '2026-09-30T10:40:00Z',
    dataSource: 'ACCEPTED_RECORDS',
  };
  const process = jest.fn().mockResolvedValue(undefined);
  const activeRules = jest.fn().mockResolvedValue([rule]);
  const useCase = new ProcessActivityEventUseCase({
    process,
    activeRules,
  } as unknown as ActivityRepository);

  beforeEach(() => {
    process.mockClear();
    activeRules.mockClear();
  });

  it('matches a recent accepted record by an explicitly reported field', async () => {
    await useCase.execute('project-1', event);
    expect(process).toHaveBeenCalledWith('project-1', event, [
      { rule, groupValue: '203.0.113.195' },
    ]);
  });

  it('stores old records without generating findings', async () => {
    const old = { ...event, timestamp: '2026-09-29T10:42:30Z' };
    await useCase.execute('project-1', old);
    expect(activeRules).not.toHaveBeenCalled();
    expect(process).toHaveBeenCalledWith('project-1', old, []);
  });

  it('does not match when a grouping field is absent', async () => {
    const noIp = { ...event, client: undefined };
    await useCase.execute('project-1', noIp);
    expect(process).toHaveBeenCalledWith('project-1', noIp, []);
  });
});
