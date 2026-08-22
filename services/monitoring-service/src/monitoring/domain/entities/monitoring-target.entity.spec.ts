import {
  MonitoringTarget,
  type MonitoringTargetProps,
} from './monitoring-target.entity';
import { describe, expect, it } from '@jest/globals';

describe('MonitoringTarget', () => {
  it('UT-MT-001: should create a target with default values', () => {
    // Arrange + Act
    const target = MonitoringTarget.create('target-001', {
      assetId: 'asset-001',
    });

    const result = target.toObject();

    // Assert: ข้อมูลประจำตัว
    expect(result.targetId).toBe('target-001');
    expect(result.assetId).toBe('asset-001');

    // Assert: ค่า Default
    expect(result.port).toBe(9100);
    expect(result.path).toBe('/metrics');
    expect(result.scrapeIntervalSeconds).toBe(15);

    // Assert: สถานะเริ่มต้น
    expect(result.verificationStatus).toBe('NOT_VERIFIED');
    expect(result.monitoringEnabled).toBe(false);

    // Assert: ประวัติเริ่มต้น
    expect(result.lastVerifiedAt).toBeNull();
    expect(result.lastCollectedAt).toBeNull();
    expect(result.lastError).toBeNull();

    // Assert: Timestamp
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('UT-MT-002: should use the provided configuration', () => {
    // Arrange + Act
    const target = MonitoringTarget.create('target-002', {
      assetId: 'asset-002',
      host: 'server-02.local',
      port: 9200,
      path: '/custom-metrics',
      scrapeIntervalSeconds: 30,
    });

    const result = target.toObject();

    // Assert
    expect(result.port).toBe(9200);
    expect(result.path).toBe('/custom-metrics');
    expect(result.scrapeIntervalSeconds).toBe(30);
  });

  it('UT-MT-003: should throw when assetId is missing', () => {
    expect(() =>
      MonitoringTarget.create('target-003', {
        assetId: '',
        host: '192.168.1.10',
      }),
    ).toThrow('assetId is required');
  });

  it('UT-MT-004: should throw when host is missing', () => {
    expect(() =>
      MonitoringTarget.create('target-004', {
        assetId: 'asset-001',
        host: '',
      }),
    ).toThrow('host is required');
  });

  it.each([0, 65536])('UT-MT-005: should reject invalid port %s', (port) => {
    expect(() =>
      MonitoringTarget.create('target-005', {
        assetId: 'asset-001',
        host: '192.168.1.10',
        port,
      }),
    ).toThrow('port must be between 1 and 65535');
  });

  it('UT-MT-006: should reject path without leading slash', () => {
    expect(() =>
      MonitoringTarget.create('target-006', {
        assetId: 'asset-001',
        host: '192.168.1.10',
        path: 'metrics',
      }),
    ).toThrow('path must start with /');
  });

  it('UT-MT-007: should reject scrape interval below 5 seconds', () => {
    expect(() =>
      MonitoringTarget.create('target-007', {
        assetId: 'asset-001',
        host: '192.168.1.10',
        scrapeIntervalSeconds: 4,
      }),
    ).toThrow('scrapeIntervalSeconds must be at least 5 seconds');
  });

  it('UT-MT-008: should restore target from existing props', () => {
    const props: MonitoringTargetProps = {
      targetId: 'target-008',
      assetId: 'asset-001',
      host: '192.168.1.10',
      port: 9100,
      path: '/metrics',
      scrapeIntervalSeconds: 15,
      verificationStatus: 'VERIFIED',
      monitoringEnabled: true,
      lastVerifiedAt: new Date('2026-08-01T10:00:00.000Z'),
      lastCollectedAt: new Date('2026-08-01T10:05:00.000Z'),
      lastError: null,
      createdAt: new Date('2026-07-30T10:00:00.000Z'),
      updatedAt: new Date('2026-08-01T10:05:00.000Z'),
    };

    const target = MonitoringTarget.restore(props);

    const result = target.toObject();

    expect(result).toEqual(props);
    expect(result.verificationStatus).toBe('VERIFIED');
    expect(result.monitoringEnabled).toBe(true);
  });

  it('UT-MT-009: should mark target as verified and clear previous error', () => {
    const target = MonitoringTarget.create('target-009', {
      assetId: 'asset-001',
      host: '192.168.1.10',
    });

    target.markVerificationFailed('Connection timeout');

    expect(target.toObject().lastError).toBe('Connection timeout');
    expect(target.toObject().verificationStatus).toBe('FAILED');

    target.markVerified();

    const result = target.toObject();

    expect(result.verificationStatus).toBe('VERIFIED');
    expect(result.lastVerifiedAt).toBeInstanceOf(Date);
    expect(result.lastError).toBeNull();
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('UT-MT-010: should mark verification as failed and disable monitoring', () => {
    const target = MonitoringTarget.create('target-010', {
      assetId: 'asset-001',
      host: '192.168.1.10',
    });

    // จำลองว่า Target เคย Verify ผ่านและเปิด Monitoring อยู่
    target.markVerified();
    target.enableMonitoring();

    expect(target.toObject().monitoringEnabled).toBe(true);

    // จำลองการ Verify รอบใหม่แล้วล้มเหลว
    target.markVerificationFailed('Connection refused');

    const result = target.toObject();

    expect(result.verificationStatus).toBe('FAILED');
    expect(result.monitoringEnabled).toBe(false);
    expect(result.lastError).toBe('Connection refused');
    expect(result.lastVerifiedAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('UT-MT-011: should not enable monitoring before verification', () => {
    const target = MonitoringTarget.create('target-011', {
      assetId: 'asset-001',
      host: '192.168.1.10',
    });

    expect(() => target.enableMonitoring()).toThrow(
      'Monitoring target must be verified before enabling monitoring',
    );

    expect(target.toObject().verificationStatus).toBe('NOT_VERIFIED');
    expect(target.toObject().monitoringEnabled).toBe(false);
  });

  it('UT-MT-012: should enable monitoring after verification', () => {
    const target = MonitoringTarget.create('target-012', {
      assetId: 'asset-001',
      host: '192.168.1.10',
    });

    target.markVerified();
    target.enableMonitoring();

    const result = target.toObject();

    expect(result.verificationStatus).toBe('VERIFIED');
    expect(result.monitoringEnabled).toBe(true);
    expect(result.lastVerifiedAt).toBeInstanceOf(Date);
  });

  it('UT-MT-013: should disable monitoring without changing verification status', () => {
    const target = MonitoringTarget.create('target-013', {
      assetId: 'asset-001',
      host: '192.168.1.10',
    });

    target.markVerified();
    target.enableMonitoring();

    expect(target.toObject().monitoringEnabled).toBe(true);

    target.disableMonitoring();

    const result = target.toObject();

    expect(result.monitoringEnabled).toBe(false);
    expect(result.verificationStatus).toBe('VERIFIED');
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('UT-MT-014: should store collection error without changing target status', () => {
    const target = MonitoringTarget.create('target-014', {
      assetId: 'asset-001',
      host: '192.168.1.10',
    });

    target.markVerified();
    target.enableMonitoring();

    target.markCollectionFailed('Request timed out');

    const result = target.toObject();

    expect(result.lastError).toBe('Request timed out');
    expect(result.lastCollectedAt).toBeNull();
    expect(result.verificationStatus).toBe('VERIFIED');
    expect(result.monitoringEnabled).toBe(true);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('UT-MT-015: should update collection time and clear previous error', () => {
    const target = MonitoringTarget.create('target-015', {
      assetId: 'asset-001',
      host: '192.168.1.10',
    });

    // จำลองว่า Collect รอบก่อนล้มเหลว
    target.markCollectionFailed('Request timed out');

    expect(target.toObject().lastError).toBe('Request timed out');
    expect(target.toObject().lastCollectedAt).toBeNull();

    // จำลองว่า Collect รอบใหม่สำเร็จ
    target.markCollected();

    const result = target.toObject();

    expect(result.lastCollectedAt).toBeInstanceOf(Date);
    expect(result.lastError).toBeNull();
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('UT-MT-016: should build the correct scrape URL', () => {
    const target = MonitoringTarget.create('target-016', {
      assetId: 'asset-001',
      host: '192.168.1.10',
      port: 9100,
      path: '/metrics',
    });

    const result = target.getScrapeUrl();

    expect(result).toBe('http://192.168.1.10:9100/metrics');
  });

  it('UT-MT-017: should return a copy of internal props', () => {
    const target = MonitoringTarget.create('target-017', {
      assetId: 'asset-001',
      host: '192.168.1.10',
    });

    const copiedData = target.toObject();

    // ทดลองแก้ Object ที่ได้จาก toObject()
    copiedData.host = 'modified-host';
    copiedData.monitoringEnabled = true;

    // อ่านข้อมูลจาก Entity อีกครั้ง
    const actualData = target.toObject();

    expect(actualData.host).toBe('192.168.1.10');
    expect(actualData.monitoringEnabled).toBe(false);
  });
});
