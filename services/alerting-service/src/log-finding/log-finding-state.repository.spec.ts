import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { notificationOutbox } from '../database/schema/alerts.schema';
import { logFindingStates } from '../database/schema/log-finding.schema';
import type { LogFindingCandidate } from './log-finding-buffer';
import { LogFindingStateRepository } from './log-finding-state.repository';

const candidate: LogFindingCandidate = {
  candidateId: 'candidate-1',
  ruleId: 'df0e7970-37a4-4a28-bb64-ae85d5d648dd',
  ruleName: 'Login failures',
  serviceName: 'auth',
  severity: 'high',
  safeMessage: 'Bearer token password=hidden',
  projectId: 'c4259ce4-c164-4b62-a11a-8aa01d939096',
  threshold: 3,
  timeWindowSeconds: 60,
  cooldownMinutes: 15,
  occurredAt: '2026-10-05T00:00:00.000Z',
};

describe('LogFindingStateRepository', () => {
  it('writes state and a sanitized outbox event in one transaction', async () => {
    const writes: { table: unknown; value: unknown }[] = [];
    const tx = {
      insert: jest.fn((table: unknown) => ({
        values: (value: unknown) => {
          writes.push({ table, value });
          return table === logFindingStates
            ? {
                onConflictDoNothing: () => ({
                  returning: () =>
                    Promise.resolve([{ fingerprint: 'f'.repeat(64) }]),
                }),
              }
            : Promise.resolve();
        },
      })),
    };
    const db = {
      transaction: async <T>(
        run: (transaction: typeof tx) => Promise<T>,
      ): Promise<T> => run(tx),
    } as unknown as NodePgDatabase;
    const repository = new LogFindingStateRepository(db);

    const result = await repository.persistTransition({
      candidate,
      fingerprint: 'f'.repeat(64),
      kind: 'trigger',
      matchCount: 3,
      countOverflow: false,
      at: new Date('2026-10-05T00:00:00.000Z'),
    });

    expect(result.accepted).toBe(true);
    expect(writes.map((write) => write.table)).toEqual([
      logFindingStates,
      notificationOutbox,
    ]);
    const event = (writes[1].value as { payload: Record<string, unknown> })
      .payload;
    expect(event).toMatchObject({
      eventType: 'log_finding_alert',
      matchCount: 3,
      deepLink: '/explorer?projectId=c4259ce4-c164-4b62-a11a-8aa01d939096',
    });
    expect(JSON.stringify(event)).not.toContain('hidden');
    expect(JSON.stringify(event)).not.toContain('token');
  });

  it('does not enqueue a duplicate while the fingerprint is already suppressed', async () => {
    const insert = jest.fn(() => ({
      values: () => ({
        onConflictDoNothing: () => ({ returning: () => Promise.resolve([]) }),
      }),
    }));
    const select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          limit: () => ({
            for: () =>
              Promise.resolve([
                { suppressedUntil: new Date('2026-10-05T00:10:00.000Z') },
              ]),
          }),
        }),
      }),
    }));
    const tx = { insert, select, update: jest.fn() };
    const db = {
      transaction: async <T>(
        run: (transaction: typeof tx) => Promise<T>,
      ): Promise<T> => run(tx),
    } as unknown as NodePgDatabase;
    const repository = new LogFindingStateRepository(db);

    const result = await repository.persistTransition({
      candidate,
      fingerprint: 'f'.repeat(64),
      kind: 'trigger',
      matchCount: 3,
      countOverflow: false,
      at: new Date('2026-10-05T00:00:00.000Z'),
    });

    expect(result).toEqual({
      accepted: false,
      suppressedUntil: new Date('2026-10-05T00:10:00.000Z'),
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(tx.update).not.toHaveBeenCalled();
  });
});
