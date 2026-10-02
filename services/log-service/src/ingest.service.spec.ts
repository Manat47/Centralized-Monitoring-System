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
  let db: jest.Mocked<
    Pick<DataStore, 'recordAccepted' | 'query' | 'batchStatus'>
  >;
  let infra: jest.Mocked<
    Pick<
      LogInfrastructure,
      'publishLogs' | 'recordAggregate' | 'recordRejection'
    >
  >;
  let service: IngestService;

  beforeEach(() => {
    db = {
      recordAccepted: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
      batchStatus: jest.fn(),
    };
    infra = {
      publishLogs: jest.fn().mockResolvedValue(undefined),
      recordAggregate: jest.fn().mockResolvedValue(undefined),
      recordRejection: jest.fn().mockResolvedValue(undefined),
    };
    service = new IngestService(
      db as unknown as DataStore,
      infra as unknown as LogInfrastructure,
    );
  });

  it('rejects an entire batch when one event is invalid', async () => {
    await expect(
      service.ingest('project-1', [event, { event_type: 'other' }]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(infra.publishLogs).not.toHaveBeenCalled();
    expect(db.recordAccepted).not.toHaveBeenCalled();
  });

  it('accepts a single record with a custom events field', async () => {
    const record = { ...event, events: [{ custom: true }] };
    await expect(service.ingest('project-1', record)).resolves.toMatchObject({
      acceptedRecords: 1,
    });
    expect(infra.publishLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        events: [expect.objectContaining({ rawPayload: record })],
      }),
    );
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
    expect(result).toMatchObject({ acceptedRecords: 1, duplicate: false });
    expect(typeof result.batchId).toBe('string');
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

  it('returns acceptance after broker confirmation when the ledger needs a worker retry', async () => {
    db.recordAccepted.mockRejectedValueOnce(new Error('database unavailable'));
    const result = await service.ingest('project-1', event);
    expect(result).toMatchObject({ acceptedRecords: 1, duplicate: false });
    expect(typeof result.batchId).toBe('string');
    expect(infra.publishLogs).toHaveBeenCalledTimes(1);
  });

  it('returns the prior result for a repeated idempotency key', async () => {
    const hash = createHash('sha256')
      .update(JSON.stringify([event]))
      .digest('hex');
    db.query
      .mockResolvedValueOnce({ rowCount: 1 } as never)
      .mockResolvedValueOnce({ rowCount: 0 } as never)
      .mockResolvedValueOnce({
        rows: [
          {
            status: 'ACCEPTED',
            payload_hash: hash,
            accepted_count: 1,
            batch_id: 'prior-batch',
          },
        ],
      } as never);
    await expect(
      service.ingest('project-1', event, 'retry-1'),
    ).resolves.toEqual({
      acceptedRecords: 1,
      duplicate: true,
      batchId: 'prior-batch',
    });
    expect(infra.publishLogs).not.toHaveBeenCalled();
  });

  it('reads a batch only within the project derived from the token', async () => {
    jest
      .spyOn(service, 'authenticate')
      .mockResolvedValue({ projectId: 'project-1', tokenId: 'token-1' });
    db.batchStatus.mockResolvedValue({
      batchId: 'batch-1',
      requestId: 'request-1',
      acceptedAt: new Date(),
      acceptedRecords: 1,
      status: 'STORED',
      processedAt: new Date(),
      failureReason: null,
    });
    await service.batchStatus('Bearer prj_live_test', 'batch-1');
    expect(db.batchStatus).toHaveBeenCalledWith('project-1', 'batch-1');
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

  it('counts a valid-token request and rejects the one above the RPM limit', async () => {
    const security = {
      tokenHash: jest.fn().mockReturnValue('hashed'),
      redis: {
        exists: jest.fn().mockResolvedValue(0),
        get: jest
          .fn()
          .mockResolvedValue(
            JSON.stringify({ project_id: 'project-1', token_id: 'token-1' }),
          ),
      },
      rateLimitRpm: 600,
      recordRequest: jest.fn().mockResolvedValue(601),
      recordRejection: jest.fn().mockResolvedValue(undefined),
    };
    const secured = new IngestService(
      db as unknown as DataStore,
      security as unknown as LogInfrastructure,
    );
    await expect(
      secured.authenticate('Bearer prj_live_abc'),
    ).rejects.toMatchObject({ status: 429 });
    expect(security.recordRequest).toHaveBeenCalledWith('project-1');
    expect(infra.publishLogs).not.toHaveBeenCalled();
  });
});
