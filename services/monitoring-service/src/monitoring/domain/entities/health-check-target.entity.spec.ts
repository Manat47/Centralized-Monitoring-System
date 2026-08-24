import { describe, expect, it } from '@jest/globals';

import {
  HealthCheckTarget,
  normalizeHealthCheckUrl,
} from './health-check-target.entity';

describe('HealthCheckTarget', () => {
  it('creates a running target with a canonical URL', () => {
    const target = HealthCheckTarget.create('target-1', {
      assetId: 'asset-1',
      url: ' HTTPS://Example.COM:443/health#status ',
    });

    expect(target.toObject()).toMatchObject({
      healthCheckTargetId: 'target-1',
      assetId: 'asset-1',
      url: 'https://example.com/health',
      checkIntervalSeconds: 15,
      enabled: true,
      archivedAt: null,
      lastCheckedAt: null,
    });
  });

  it('preserves path case and query string while removing fragments', () => {
    expect(
      normalizeHealthCheckUrl('http://Example.com:80/Health?mode=full#debug'),
    ).toBe('http://example.com/Health?mode=full');
  });

  it('rejects unsupported URL protocols and short intervals', () => {
    expect(() =>
      HealthCheckTarget.create('target-2', {
        assetId: 'asset-1',
        url: 'ftp://example.com/health',
      }),
    ).toThrow('Health check URL must use HTTP or HTTPS');

    expect(() =>
      HealthCheckTarget.create('target-2', {
        assetId: 'asset-1',
        url: 'https://example.com/health',
        checkIntervalSeconds: 4,
      }),
    ).toThrow('Check interval must be at least 5 seconds');
  });

  it('updates only the interval and preserves identity and URL', () => {
    const target = HealthCheckTarget.create('target-3', {
      assetId: 'asset-1',
      url: 'https://example.com/health',
    });

    target.updateInterval(30);

    expect(target.toObject()).toMatchObject({
      healthCheckTargetId: 'target-3',
      url: 'https://example.com/health',
      checkIntervalSeconds: 30,
    });
  });

  it('archives without deleting history identity and blocks further changes', () => {
    const target = HealthCheckTarget.create('target-4', {
      assetId: 'asset-1',
      url: 'https://example.com/health',
    });

    target.archive();

    expect(target.toObject().enabled).toBe(false);
    expect(target.toObject().archivedAt).toBeInstanceOf(Date);
    expect(() => target.enable()).toThrow(
      'Archived health check target cannot be enabled',
    );
    expect(() => target.updateInterval(60)).toThrow(
      'Archived health check target cannot be updated',
    );
  });
});
