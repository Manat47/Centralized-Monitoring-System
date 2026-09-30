import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DataStore } from './data.store';
import { IngestService } from './ingest.service';
import { LogInfrastructure } from './log.infrastructure';

const event = {
  timestamp: new Date().toISOString(),
  source: 'payments',
  event_type: 'failed',
  message: 'Gateway timeout',
};

describe('IngestService', () => {
  let db: jest.Mocked<Pick<DataStore, 'recordAccepted' | 'query'>>;
  let infra: jest.Mocked<Pick<LogInfrastructure, 'publishLogs'>>;
  let service: IngestService;

  beforeEach(() => {
    db = {
      recordAccepted: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
    };
    infra = { publishLogs: jest.fn().mockResolvedValue(undefined) };
    service = new IngestService(
      db as unknown as DataStore,
      infra as unknown as LogInfrastructure,
    );
  });

  it('rejects an entire batch when one event is invalid', async () => {
    await expect(
      service.ingest('project-1', [event, { ...event, project_id: 'other' }]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(infra.publishLogs).not.toHaveBeenCalled();
    expect(db.recordAccepted).not.toHaveBeenCalled();
  });

  it('derives the project from authentication and records acceptance after broker confirmation', async () => {
    const order: string[] = [];
    infra.publishLogs.mockImplementation(() => {
      order.push('broker');
      return Promise.resolve();
    });
    db.recordAccepted.mockImplementation(() => {
      order.push('ledger');
      return Promise.resolve();
    });
    const result = await service.ingest('server-project', event);
    expect(result).toEqual({ acceptedRecords: 1, duplicate: false });
    expect(infra.publishLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'server-project',
        events: [expect.objectContaining({ source: 'payments' })],
      }),
    );
    expect(order).toEqual(['broker', 'ledger']);
  });

  it('never records accepted usage when broker confirmation fails', async () => {
    infra.publishLogs.mockRejectedValue(new Error('broker unavailable'));
    await expect(service.ingest('project-1', event)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(db.recordAccepted).not.toHaveBeenCalled();
  });

  it('returns the prior result for a repeated idempotency key', async () => {
    const hash = createHash('sha256')
      .update(JSON.stringify([event]))
      .digest('hex');
    db.query
      .mockResolvedValueOnce({ rowCount: 1 } as never)
      .mockResolvedValueOnce({ rowCount: 0 } as never)
      .mockResolvedValueOnce({
        rows: [{ status: 'ACCEPTED', payload_hash: hash, accepted_count: 1 }],
      } as never);
    await expect(
      service.ingest('project-1', event, 'retry-1'),
    ).resolves.toEqual({ acceptedRecords: 1, duplicate: true });
    expect(infra.publishLogs).not.toHaveBeenCalled();
  });

  it('rejects a revoked token before consulting the token cache or database', async () => {
    const security = {
      tokenHash: jest.fn().mockReturnValue('hashed'),
      redis: { exists: jest.fn().mockResolvedValue(1) },
      recordRequest: jest.fn().mockResolvedValue(undefined),
    };
    const secured = new IngestService(
      db as unknown as DataStore,
      security as unknown as LogInfrastructure,
    );
    await expect(
      secured.authenticate('Bearer prj_live_abc'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.query).not.toHaveBeenCalled();
    expect(security.recordRequest).toHaveBeenCalledWith(null);
  });
});
