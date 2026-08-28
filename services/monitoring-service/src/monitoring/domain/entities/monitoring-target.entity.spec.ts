import { MonitoringTarget } from './monitoring-target.entity';

describe('MonitoringTarget', () => {
  function createNodeTarget(): MonitoringTarget {
    return MonitoringTarget.create('target-001', {
      assetId: 'asset-001',
      monitoringType: 'NODE_EXPORTER',
    });
  }

  it('creates a node exporter target with lifecycle defaults', () => {
    const result = createNodeTarget().toObject();

    expect(result).toMatchObject({
      targetId: 'target-001',
      assetId: 'asset-001',
      monitoringType: 'NODE_EXPORTER',
      protocol: 'HTTP',
      port: 9100,
      path: '/metrics',
      scrapeIntervalSeconds: 15,
      verificationStatus: 'NOT_VERIFIED',
      monitoringEnabled: false,
      archivedAt: null,
    });
  });

  it('requires explicit endpoint configuration for application metrics', () => {
    expect(() =>
      MonitoringTarget.create('target-002', {
        assetId: 'asset-002',
        monitoringType: 'PROMETHEUS_APPLICATION',
      }),
    ).toThrow('port is required for PROMETHEUS_APPLICATION monitoring');
  });

  it('validates port, path, and scrape interval', () => {
    expect(() =>
      MonitoringTarget.create('target-003', {
        assetId: 'asset-003',
        monitoringType: 'NODE_EXPORTER',
        port: 0,
      }),
    ).toThrow('port must be between 1 and 65535');

    expect(() =>
      MonitoringTarget.create('target-004', {
        assetId: 'asset-004',
        monitoringType: 'NODE_EXPORTER',
        path: 'metrics',
      }),
    ).toThrow('path must start with /');

    expect(() =>
      MonitoringTarget.create('target-005', {
        assetId: 'asset-005',
        monitoringType: 'NODE_EXPORTER',
        scrapeIntervalSeconds: 4,
      }),
    ).toThrow('scrapeIntervalSeconds must be at least 5 seconds');
  });

  it('enables monitoring only after successful verification', () => {
    const target = createNodeTarget();

    expect(() => target.enableMonitoring()).toThrow(
      'Monitoring target must be verified before enabling monitoring',
    );

    target.markVerified('fingerprint');
    target.enableMonitoring();

    expect(target.toObject()).toMatchObject({
      verificationStatus: 'VERIFIED',
      verifiedConfigFingerprint: 'fingerprint',
      monitoringEnabled: true,
    });
  });

  it('archives a target without removing its configuration or history', () => {
    const target = createNodeTarget();
    target.markVerified('fingerprint');
    target.enableMonitoring();
    target.markCollected();

    target.archive();

    const result = target.toObject();
    expect(result.monitoringEnabled).toBe(false);
    expect(result.archivedAt).toBeInstanceOf(Date);
    expect(result.lastCollectedAt).toBeInstanceOf(Date);
    expect(result.port).toBe(9100);
    expect(result.path).toBe('/metrics');
  });

  it('prevents archived targets from returning to an active lifecycle', () => {
    const target = createNodeTarget();
    target.archive();

    expect(() => target.markVerified('fingerprint')).toThrow(
      'Archived monitoring target cannot be changed',
    );
    expect(() => target.enableMonitoring()).toThrow(
      'Archived monitoring target cannot be changed',
    );
    expect(() => target.archive()).toThrow(
      'Monitoring target is already archived',
    );
  });

  it('returns a copy of its internal state', () => {
    const target = createNodeTarget();
    const copy = target.toObject();
    copy.monitoringEnabled = true;

    expect(target.toObject().monitoringEnabled).toBe(false);
  });
});
