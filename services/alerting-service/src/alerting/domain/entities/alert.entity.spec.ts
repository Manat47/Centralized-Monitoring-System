import { Alert } from './alert.entity';

describe('Alert', () => {
  const createAlert = () =>
    Alert.create('alert-1', {
      ruleId: 'rule-1',
      assetId: 'asset-1',
      metricType: 'CPU_USAGE',
      severity: 'WARNING',
      thresholdValue: 80,
      actualValue: 90,
      message: 'CPU usage exceeded threshold',
      triggeredAt: new Date('2026-07-14T10:00:00.000Z'),
    });

  it('should create an alert with TRIGGERED status', () => {
    const alert = createAlert();
    const result = alert.toObject();

    expect(result.status).toBe('TRIGGERED');
    expect(result.acknowledgedAt).toBeNull();
    expect(result.resolvedAt).toBeNull();
    expect(result.closedAt).toBeNull();
  });

  it('should acknowledge a triggered alert', () => {
    const alert = createAlert();
    const acknowledgedAt = new Date('2026-07-14T10:05:00.000Z');

    alert.acknowledge(acknowledgedAt);

    const result = alert.toObject();

    expect(result.status).toBe('ACKNOWLEDGED');
    expect(result.acknowledgedAt).toEqual(acknowledgedAt);
  });

  it('should resolve an acknowledged alert', () => {
    const alert = createAlert();

    alert.acknowledge();

    const resolvedAt = new Date('2026-07-14T10:10:00.000Z');

    alert.resolve(50, resolvedAt);

    const result = alert.toObject();

    expect(result.status).toBe('RESOLVED');
    expect(result.actualValue).toBe(50);
    expect(result.resolvedAt).toEqual(resolvedAt);
  });

  it('should close a resolved alert', () => {
    const alert = createAlert();

    alert.resolve(50, new Date());

    const closedAt = new Date('2026-07-14T10:15:00.000Z');

    alert.close(closedAt);

    const result = alert.toObject();

    expect(result.status).toBe('CLOSED');
    expect(result.closedAt).toEqual(closedAt);
  });

  it('should reject acknowledge when status is RESOLVED', () => {
    const alert = createAlert();

    alert.resolve(50, new Date());

    expect(() => alert.acknowledge()).toThrow(
      'Cannot acknowledge alert with status RESOLVED',
    );
  });

  it('should reject close when status is TRIGGERED', () => {
    const alert = createAlert();

    expect(() => alert.close()).toThrow(
      'Cannot close alert with status TRIGGERED',
    );
  });
});
