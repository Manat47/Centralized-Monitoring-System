import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { AuditEventPublisher } from '../alerting/domain/port/audit-event-publisher.port';
import { LogFindingManageController } from './log-finding-manage.controller';
import type { LogFindingRuleSummaryReader } from './log-finding-rule-summary.reader';
import type { CreateLogFindingRuleDto } from './log-finding-rule.dto';

const secret = 'internal-test-secret';
const actorId = 'cd09ba85-085d-4a77-b0ac-3b4afac11f4f';
const actor = [actorId, 'ADMIN', 'admin@example.com'] as const;
const input: CreateLogFindingRuleDto = {
  name: 'Payment timeouts',
  serviceName: 'billing',
  searchQuery: 'regex:timeout|connection refused',
  severity: 'high',
  threshold: 3,
  timeWindowSeconds: 60,
  cooldownMinutes: 15,
  isEnabled: true,
};

describe('LogFindingManageController', () => {
  const returning = jest.fn();
  const where = jest.fn().mockReturnValue({ returning });
  const values = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where });
  const insert = jest.fn().mockReturnValue({ values });
  const update = jest.fn().mockReturnValue({ set });
  const remove = jest.fn().mockReturnValue({ where });
  const db = {
    insert,
    update,
    delete: remove,
  } as unknown as NodePgDatabase;
  const config = {
    get: jest.fn().mockReturnValue(secret),
  } as unknown as ConfigService;
  const listSummaries = jest.fn();
  const summaries = {
    list: listSummaries,
  } as unknown as LogFindingRuleSummaryReader;
  const publish = jest.fn().mockResolvedValue(undefined);
  const auditEvents = { publish } as unknown as AuditEventPublisher;
  const controller = new LogFindingManageController(
    db,
    config,
    summaries,
    auditEvents,
  );

  beforeEach(() => jest.clearAllMocks());

  it('lists trigger summaries only for requests from the gateway', async () => {
    listSummaries.mockResolvedValueOnce([
      { id: 'rule-1', lastTriggeredAt: null, triggeredFingerprintCount: 0 },
    ]);
    expect(() => controller.list('wrong')).toThrow(ForbiddenException);
    expect(listSummaries).not.toHaveBeenCalled();
    await expect(controller.list(secret)).resolves.toMatchObject([
      { id: 'rule-1', lastTriggeredAt: null, triggeredFingerprintCount: 0 },
    ]);
  });

  it('requires the gateway secret before changing rules', async () => {
    await expect(
      controller.create('wrong', input, ...actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('rejects missing or unverified actor headers before changing rules', async () => {
    await expect(controller.create(secret, input)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      controller.create(secret, input, actorId, 'OPERATOR'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('creates a rule with a validated regex query', async () => {
    returning.mockResolvedValueOnce([{ id: 'created', ...input }]);
    await expect(
      controller.create(secret, input, ...actor),
    ).resolves.toMatchObject({
      id: 'created',
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        name: input.name,
        searchQuery: input.searchQuery,
        serviceName: input.serviceName,
      }),
    );
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: actorId,
        actorRole: 'ADMIN',
        actorEmail: 'admin@example.com',
        action: 'LOG_FINDING_RULE_CREATED',
        resourceType: 'LOG_FINDING_RULE',
        resourceId: 'created',
        resourceName: input.name,
      }),
    );
  });

  it('rejects a regex that the matcher would discard', async () => {
    await expect(
      controller.create(
        secret,
        { ...input, searchQuery: 'regex:(a+)+$' },
        ...actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(insert).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('updates enabled state and reports a missing rule', async () => {
    returning
      .mockResolvedValueOnce([
        { id: 'rule-1', name: input.name, isEnabled: false },
      ])
      .mockResolvedValueOnce([]);
    await expect(
      controller.update(
        secret,
        '11111111-1111-4111-8111-111111111111',
        {
          isEnabled: false,
        },
        ...actor,
      ),
    ).resolves.toMatchObject({ isEnabled: false });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: false }),
    );
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: actorId,
        action: 'LOG_FINDING_RULE_UPDATED',
        resourceId: 'rule-1',
        resourceName: input.name,
        metadata: { changedFields: ['isEnabled'] },
      }),
    );
    await expect(
      controller.update(
        secret,
        '11111111-1111-4111-8111-111111111111',
        {
          isEnabled: false,
        },
        ...actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('deletes a rule and its cascaded state', async () => {
    returning.mockResolvedValueOnce([{ id: 'rule-1', name: input.name }]);
    await expect(
      controller.remove(
        secret,
        '11111111-1111-4111-8111-111111111111',
        ...actor,
      ),
    ).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: actorId,
        action: 'LOG_FINDING_RULE_DELETED',
        resourceId: 'rule-1',
        resourceName: input.name,
      }),
    );
  });

  it('does not audit a delete when the rule does not exist', async () => {
    returning.mockResolvedValueOnce([]);
    await expect(
      controller.remove(
        secret,
        '11111111-1111-4111-8111-111111111111',
        ...actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(publish).not.toHaveBeenCalled();
  });
});
