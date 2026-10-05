import { of } from 'rxjs';
import type { HttpService } from '@nestjs/axios';
import type { ConfigService } from '@nestjs/config';

import { DashboardService } from './dashboard.service';

describe('DashboardService upstream contract', () => {
  it('keeps the expected HTTP status and standalone alert from upstream responses', async () => {
    const now = new Date().toISOString();
    const get = jest.fn((url: string) => {
      const responseByPath: Record<string, unknown> = {
        'http://localhost:3000/assets': [
          {
            assetId: 'app-1',
            name: 'Application',
            hostname: null,
            targetType: 'APPLICATION',
            ipAddress: null,
            endpoint: 'https://app.example.com',
            environment: 'PRODUCTION',
            status: 'ACTIVATE',
            updatedAt: now,
          },
        ],
        'http://localhost:3001/monitoring-targets': [],
        'http://localhost:3001/health-check-targets': [
          {
            healthCheckTargetId: 'health-app',
            assetId: 'app-1',
            name: 'Application redirect',
            url: 'https://app.example.com',
            expectedStatus: 302,
            checkIntervalSeconds: 30,
            enabled: true,
            archivedAt: null,
            lastCheckedAt: now,
            latest: {
              timestamp: now,
              statusCode: 302,
              responseTimeMs: 45,
              error: null,
            },
          },
          {
            healthCheckTargetId: 'health-standalone',
            assetId: null,
            name: 'External site',
            url: 'https://external.example.com',
            expectedStatus: 200,
            checkIntervalSeconds: 30,
            enabled: true,
            archivedAt: null,
            lastCheckedAt: null,
            latest: null,
          },
        ],
        'http://localhost:3001/monitoring-targets/metrics/latest-summaries': [],
        'http://localhost:3002/alerts?status=TRIGGERED&page=1&limit=100': {
          items: [
            {
              alertId: 'alert-standalone',
              assetId: null,
              sourceType: 'HEALTH_CHECK',
              sourceId: 'health-standalone',
              severity: 'WARNING',
              status: 'TRIGGERED',
              message: 'External site unavailable',
              triggeredAt: now,
            },
          ],
          totalPages: 1,
        },
        'http://localhost:3002/alerts?status=ACKNOWLEDGED&page=1&limit=100': {
          items: [],
          totalPages: 0,
        },
      };

      if (!(url in responseByPath)) throw new Error(`Unexpected URL: ${url}`);
      return of({ data: responseByPath[url] });
    });
    const service = new DashboardService(
      { get } as unknown as HttpService,
      { get: () => undefined } as unknown as ConfigService,
    );

    const summary = await service.getSummary();

    expect(summary.assetOverview[0].healthChecks?.status).toBe('AVAILABLE');
    expect(summary.standaloneChecks[0]).toMatchObject({
      healthCheckTargetId: 'health-standalone',
      activeAlerts: 1,
    });
    expect(summary.alerts).toEqual({ active: 1, firing: 1 });
    expect(summary.dataQuality.stale).toBe(false);
    expect(get).toHaveBeenCalledTimes(6);

    get.mockImplementation(() => {
      throw new Error('upstream unavailable');
    });
    const fallback = await service.getSummary();
    expect(fallback.assetOverview).toEqual(summary.assetOverview);
    expect(fallback.dataQuality).toEqual({
      stale: true,
      updatedAt: summary.dataQuality.updatedAt,
    });
  });
});
