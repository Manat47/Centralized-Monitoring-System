import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { of } from 'rxjs';

import { AssetLifecycleImpactService } from './asset-lifecycle-impact.service';

describe('AssetLifecycleImpactService', () => {
  const httpService = {
    get: jest.fn(),
  } as unknown as jest.Mocked<HttpService>;
  const configService = {
    get: jest.fn(),
  } as unknown as jest.Mocked<ConfigService>;
  const service = new AssetLifecycleImpactService(httpService, configService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps inactivation to pause effects while retaining active alerts', async () => {
    httpService.get
      .mockReturnValueOnce(
        of({
          data: {
            assetId: 'asset-1',
            name: 'server-01',
            status: 'ACTIVATE',
          },
        } as never),
      )
      .mockReturnValueOnce(
        of({
          data: {
            monitoringTargets: { configured: 1, enabled: 1 },
            healthChecks: { configured: 0, enabled: 0 },
            metricRules: { configured: 2, enabled: 2 },
          },
        } as never),
      )
      .mockReturnValueOnce(
        of({
          data: { triggered: 1, acknowledged: 1, total: 2 },
        } as never),
      );

    await expect(service.getImpact('asset-1', 'INACTIVATE')).resolves.toEqual(
      expect.objectContaining({
        currentStatus: 'ACTIVATE',
        targetStatus: 'INACTIVATE',
        terminal: false,
        resources: expect.objectContaining({
          monitoringTargets: expect.objectContaining({ effect: 'PAUSE' }),
          healthChecks: expect.objectContaining({ effect: 'NONE' }),
          metricRules: expect.objectContaining({ effect: 'PAUSE' }),
        }),
        alerts: expect.objectContaining({ effect: 'RETAIN', total: 2 }),
        historyPreserved: true,
      }),
    );
  });

  it('rejects an invalid lifecycle transition before querying dependencies', async () => {
    httpService.get.mockReturnValueOnce(
      of({
        data: {
          assetId: 'asset-1',
          name: 'server-01',
          status: 'ACTIVATE',
        },
      } as never),
    );

    await expect(
      service.getImpact('asset-1', 'ACTIVATE'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps terminal deactivation to stopped resources and resolved alerts', async () => {
    httpService.get
      .mockReturnValueOnce(
        of({
          data: {
            assetId: 'asset-1',
            name: 'server-01',
            status: 'INACTIVATE',
          },
        } as never),
      )
      .mockReturnValueOnce(
        of({
          data: {
            monitoringTargets: { configured: 1, enabled: 1 },
            healthChecks: { configured: 0, enabled: 0 },
            metricRules: { configured: 2, enabled: 1 },
          },
        } as never),
      )
      .mockReturnValueOnce(
        of({
          data: { triggered: 2, acknowledged: 1, total: 3 },
        } as never),
      );

    await expect(service.getImpact('asset-1', 'DEACTIVATE')).resolves.toEqual(
      expect.objectContaining({
        terminal: true,
        readOnlyAfter: true,
        resources: expect.objectContaining({
          monitoringTargets: expect.objectContaining({ effect: 'STOP' }),
          metricRules: expect.objectContaining({ effect: 'STOP' }),
        }),
        alerts: expect.objectContaining({
          effect: 'RESOLVE',
          total: 3,
          resolutionIsAsynchronous: true,
        }),
      }),
    );
  });
});
