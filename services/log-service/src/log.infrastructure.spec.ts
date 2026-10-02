import type { Channel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { DataStore } from './data.store';
import { LogInfrastructure } from './log.infrastructure';
import { ProcessActivityEventUseCase } from './log-events/application/use-cases/process-activity-event.use-case';

describe('LogInfrastructure batch tracking', () => {
  const prior = {
    INFLUXDB_URL: process.env.INFLUXDB_URL,
    INFLUXDB_TOKEN: process.env.INFLUXDB_TOKEN,
    INFLUXDB_ORG: process.env.INFLUXDB_ORG,
  };
  let infrastructure: LogInfrastructure;
  let database: {
    recordAccepted: jest.Mock;
    markBatchStored: jest.Mock;
    markBatchFailed: jest.Mock;
  };
  let activity: { execute: jest.Mock; executeRequest: jest.Mock };
  let ack: jest.Mock;

  beforeEach(() => {
    process.env.INFLUXDB_URL = 'http://localhost:8086';
    process.env.INFLUXDB_TOKEN = 'test-token';
    process.env.INFLUXDB_ORG = 'test-org';
    database = {
      recordAccepted: jest.fn().mockResolvedValue(undefined),
      markBatchStored: jest.fn().mockResolvedValue(undefined),
      markBatchFailed: jest.fn().mockResolvedValue(undefined),
    };
    activity = {
      execute: jest.fn().mockResolvedValue(undefined),
      executeRequest: jest.fn().mockResolvedValue(undefined),
    };
    infrastructure = new LogInfrastructure(
      database as unknown as DataStore,
      activity as unknown as ProcessActivityEventUseCase,
    );
    ack = jest.fn();
    infrastructure['consumer'] = { ack } as unknown as Channel;
    infrastructure['requestConsumer'] = { ack } as unknown as Channel;
  });

  afterEach(() => {
    infrastructure.redis.disconnect();
    for (const key of Object.keys(prior) as (keyof typeof prior)[]) {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    }
  });

  function batchMessage(retryCount = 0): ConsumeMessage {
    return {
      content: Buffer.from(
        JSON.stringify({
          batchId: 'batch-1',
          projectId: 'project-1',
          tokenId: 'token-1',
          requestId: 'request-1',
          acceptedAt: new Date().toISOString(),
          events: [
            {
              eventId: 'event-1',
              timestamp: new Date().toISOString(),
              source: 's',
              event_type: 'e',
              rawPayload: {},
            },
          ],
        }),
      ),
      properties: { headers: { retryCount } },
    } as unknown as ConsumeMessage;
  }

  it('marks a confirmed batch stored before acknowledging the queue message', async () => {
    const order: string[] = [];
    database.markBatchStored.mockImplementation(() => {
      order.push('stored');
      return Promise.resolve();
    });
    ack.mockImplementation(() => {
      order.push('ack');
    });
    await infrastructure['consume'](batchMessage());
    expect(database.recordAccepted).toHaveBeenCalledTimes(1);
    expect(database.markBatchStored).toHaveBeenCalledWith('batch-1');
    expect(order).toEqual(['stored', 'ack']);
  });

  it('marks an exhausted batch failed before moving it to the dead-letter queue', async () => {
    activity.execute.mockRejectedValue(new Error('storage unavailable'));
    const publish = jest.fn().mockResolvedValue(undefined);
    infrastructure['confirmPublish'] = publish;
    await infrastructure['consume'](batchMessage(10));
    expect(database.markBatchFailed).toHaveBeenCalledWith(
      'batch-1',
      'Log processing failed after retries',
    );
    expect(publish).toHaveBeenCalledWith(
      '',
      'app_logs_dead_letter',
      expect.any(Object),
    );
    expect(ack).toHaveBeenCalledTimes(1);
  });

  it('persists a request receipt before acknowledging its message', async () => {
    const receipt = {
      requestId: 'request-1',
      projectId: 'project-1',
      tokenId: 'token-1',
      receivedAt: new Date().toISOString(),
      httpStatus: 202,
      reason: null,
      acceptedRecords: 1,
    };
    const message = {
      content: Buffer.from(JSON.stringify(receipt)),
      properties: { headers: {} },
    } as unknown as ConsumeMessage;
    await infrastructure['consumeRequest'](message);
    expect(activity.executeRequest).toHaveBeenCalledWith(receipt);
    expect(ack).toHaveBeenCalledTimes(1);
  });

  it('keeps a staged receipt for retry when RabbitMQ cannot confirm publication', async () => {
    const receipt = JSON.stringify({
      requestId: 'request-1',
      receivedAt: new Date().toISOString(),
      httpStatus: 202,
    });
    jest.spyOn(infrastructure.redis, 'lindex').mockResolvedValue(receipt);
    const remove = jest
      .spyOn(infrastructure.redis, 'lrem')
      .mockResolvedValue(1);
    infrastructure['publisher'] = {
      publish: (
        _exchange: string,
        _routingKey: string,
        _body: Buffer,
        _options: unknown,
        callback: (error: Error) => void,
      ) => {
        callback(new Error('broker unavailable'));
        return true;
      },
    } as unknown as ConfirmChannel;
    await expect(infrastructure['flushReceiptQueue']()).rejects.toThrow(
      'broker unavailable',
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it('publishes a receipt directly when Redis staging is unavailable', async () => {
    jest
      .spyOn(infrastructure.redis, 'lpush')
      .mockRejectedValue(new Error('redis unavailable'));
    const publish = jest.fn().mockResolvedValue(undefined);
    infrastructure['confirmPublish'] = publish;
    const receipt = {
      requestId: 'request-1',
      projectId: 'project-1',
      tokenId: 'token-1',
      receivedAt: new Date().toISOString(),
      httpStatus: 202,
      reason: null,
      acceptedRecords: 1,
    };
    await infrastructure.enqueueRequestReceipt(receipt);
    expect(publish).toHaveBeenCalledWith('app_logs', 'logs.requests', receipt);
  });
});
