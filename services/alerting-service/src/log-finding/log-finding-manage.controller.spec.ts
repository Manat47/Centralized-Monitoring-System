import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { LogFindingManageController } from './log-finding-manage.controller';
import type { CreateLogFindingRuleDto } from './log-finding-rule.dto';

const secret = 'internal-test-secret';
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
  const controller = new LogFindingManageController(db, config);

  beforeEach(() => jest.clearAllMocks());

  it('requires the gateway secret before changing rules', async () => {
    await expect(controller.create('wrong', input)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it('creates a rule with a validated regex query', async () => {
    returning.mockResolvedValueOnce([{ id: 'created', ...input }]);
    await expect(controller.create(secret, input)).resolves.toMatchObject({
      id: 'created',
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        name: input.name,
        searchQuery: input.searchQuery,
        serviceName: input.serviceName,
      }),
    );
  });

  it('rejects a regex that the matcher would discard', async () => {
    await expect(
      controller.create(secret, { ...input, searchQuery: 'regex:(a+)+$' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(insert).not.toHaveBeenCalled();
  });

  it('updates enabled state and reports a missing rule', async () => {
    returning
      .mockResolvedValueOnce([{ id: 'rule-1', isEnabled: false }])
      .mockResolvedValueOnce([]);
    await expect(
      controller.update(secret, '11111111-1111-4111-8111-111111111111', {
        isEnabled: false,
      }),
    ).resolves.toMatchObject({ isEnabled: false });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: false }),
    );
    await expect(
      controller.update(secret, '11111111-1111-4111-8111-111111111111', {
        isEnabled: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a rule and its cascaded state', async () => {
    returning.mockResolvedValueOnce([{ id: 'rule-1' }]);
    await expect(
      controller.remove(secret, '11111111-1111-4111-8111-111111111111'),
    ).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
