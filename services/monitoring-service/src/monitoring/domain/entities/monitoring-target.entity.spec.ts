import {
  MonitoringTarget,
  type MonitoringTargetProps,
} from './monitoring-target.entity';
import { describe, expect, it } from '@jest/globals';

it('should invalidate verification when verified configuration becomes stale', () => {
  const target = MonitoringTarget.create('target-stale', {
    assetId: 'asset-001',
    monitoringType: 'NODE_EXPORTER',
  });

  target.markVerified('a'.repeat(64));
  target.enableMonitoring();

  target.invalidateVerification();

  const result = target.toObject();

  expect(result.verificationStatus).toBe('NOT_VERIFIED');
  expect(result.monitoringEnabled).toBe(false);
  expect(result.verifiedConfigFingerprint).toBeNull();
  expect(result.lastVerifiedAt).toBeInstanceOf(Date);
});
