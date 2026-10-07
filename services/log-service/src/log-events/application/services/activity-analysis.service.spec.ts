import { BadRequestException } from '@nestjs/common';
import type { ProjectService } from '../../../project.service';
import type {
  ActivityRepository,
  RuleDraft,
} from '../../domain/repositories/activity.repository';
import { ActivityAnalysisService } from './activity-analysis.service';

describe('ActivityAnalysisService source filter', () => {
  const actor = { userId: 'user-1', role: 'ADMIN' as const };
  const draft: RuleDraft = {
    name: 'Payment errors',
    eventType: 'provider_timeout',
    dataSource: 'ACCEPTED_RECORDS',
    sourceFilter: ' payment_gateway ',
    conditionField: 'severity',
    conditionValue: 'ERROR',
    groupBy: 'project',
    threshold: 3,
    windowMinutes: 1,
  };
  const createRule = jest.fn().mockResolvedValue({ ruleId: 'rule-1' });
  const preview = jest
    .fn()
    .mockResolvedValue({ matchingRecords: 3, usableGroupRecords: 3 });
  const service = new ActivityAnalysisService(
    { createRule, preview } as unknown as ActivityRepository,
    {
      membership: jest.fn().mockResolvedValue({ role: 'OWNER' }),
    } as unknown as ProjectService,
  );

  beforeEach(() => {
    createRule.mockClear();
    preview.mockClear();
  });

  it('passes the same normalized source and severity to create and preview', async () => {
    const normalized = { ...draft, sourceFilter: 'payment_gateway' };
    await service.createRule('project-1', actor, draft);
    await service.preview('project-1', actor, draft);
    expect(createRule).toHaveBeenCalledWith('project-1', actor, normalized);
    expect(preview).toHaveBeenCalledWith('project-1', normalized);
  });

  it('keeps old rules without a source filter valid', async () => {
    await service.createRule('project-1', actor, {
      ...draft,
      sourceFilter: undefined,
    });
    expect(createRule).toHaveBeenCalledWith('project-1', actor, {
      ...draft,
      sourceFilter: null,
    });
  });

  it('rejects source filters for server-observed request rules', async () => {
    await expect(
      service.createRule('project-1', actor, {
        ...draft,
        dataSource: 'LOG_API_REQUESTS',
        eventType: 'log_api.request',
        conditionField: 'result',
        conditionValue: 'rejected',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createRule).not.toHaveBeenCalled();
  });
});
