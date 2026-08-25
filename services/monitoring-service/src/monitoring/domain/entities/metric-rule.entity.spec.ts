import { describe, expect, it } from '@jest/globals';
import {
  MetricRule,
  MetricRuleOperator,
  MetricRuleSeverity,
  MetricRuleType,
  type MetricRuleProps,
} from './metric-rule.entity';
describe('MetricRule', () => {
  it('UT-MR-001: should create a metric rule with default values', () => {
    const rule = MetricRule.create('rule-001', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      thresholdValue: 80,
      severity: MetricRuleSeverity.WARNING,
    });

    const result = rule.toObject();

    expect(result.ruleId).toBe('rule-001');
    expect(result.assetId).toBe('asset-001');
    expect(result.metricType).toBe(MetricRuleType.CPU_USAGE);
    expect(result.thresholdValue).toBe(80);
    expect(result.severity).toBe(MetricRuleSeverity.WARNING);

    expect(result.operator).toBe(MetricRuleOperator.GREATER_THAN_OR_EQUAL);
    expect(result.durationSeconds).toBe(300);
    expect(result.enabled).toBe(true);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('UT-MR-002: should create a metric rule with custom values', () => {
    const rule = MetricRule.create('rule-002', {
      assetId: 'asset-001',
      metricType: MetricRuleType.DISK_USAGE,
      operator: MetricRuleOperator.GREATER_THAN,
      thresholdValue: 90,
      durationSeconds: 60,
      severity: MetricRuleSeverity.CRITICAL,
    });

    const result = rule.toObject();

    expect(result.ruleId).toBe('rule-002');
    expect(result.assetId).toBe('asset-001');
    expect(result.metricType).toBe(MetricRuleType.DISK_USAGE);
    expect(result.operator).toBe(MetricRuleOperator.GREATER_THAN);
    expect(result.thresholdValue).toBe(90);
    expect(result.durationSeconds).toBe(60);
    expect(result.severity).toBe(MetricRuleSeverity.CRITICAL);
    expect(result.enabled).toBe(true);
  });

  it.each(['', '   '])(
    'UT-MR-003: should reject empty assetId: "%s"',
    (assetId) => {
      expect(() =>
        MetricRule.create('rule-003', {
          assetId,
          metricType: MetricRuleType.CPU_USAGE,
          thresholdValue: 80,
          severity: MetricRuleSeverity.WARNING,
        }),
      ).toThrow('Asset ID is required');
    },
  );

  it('UT-MR-004: should reject threshold value below 0', () => {
    expect(() =>
      MetricRule.create('rule-004', {
        assetId: 'asset-001',
        metricType: MetricRuleType.CPU_USAGE,
        thresholdValue: -1,
        severity: MetricRuleSeverity.WARNING,
      }),
    ).toThrow('Threshold value must be between 0 and 100');
  });

  it('UT-MR-005: should reject threshold value above 100', () => {
    expect(() =>
      MetricRule.create('rule-005', {
        assetId: 'asset-001',
        metricType: MetricRuleType.CPU_USAGE,
        thresholdValue: 101,
        severity: MetricRuleSeverity.WARNING,
      }),
    ).toThrow('Threshold value must be between 0 and 100');
  });

  it('UT-MR-006: should accept threshold value equal to 0', () => {
    const rule = MetricRule.create('rule-006', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      thresholdValue: 0,
      severity: MetricRuleSeverity.WARNING,
    });

    const result = rule.toObject();

    expect(result.thresholdValue).toBe(0);
  });

  it('UT-MR-007: should accept threshold value equal to 100', () => {
    const rule = MetricRule.create('rule-007', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      thresholdValue: 100,
      severity: MetricRuleSeverity.WARNING,
    });

    const result = rule.toObject();

    expect(result.thresholdValue).toBe(100);
  });

  it('UT-MR-008: should reject negative duration seconds', () => {
    expect(() =>
      MetricRule.create('rule-008', {
        assetId: 'asset-001',
        metricType: MetricRuleType.CPU_USAGE,
        thresholdValue: 80,
        durationSeconds: -1,
        severity: MetricRuleSeverity.WARNING,
      }),
    ).toThrow('Duration seconds must be greater than or equal to 0');
  });

  it('UT-MR-009: should accept duration seconds equal to 0', () => {
    const rule = MetricRule.create('rule-009', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      thresholdValue: 80,
      durationSeconds: 0,
      severity: MetricRuleSeverity.WARNING,
    });

    const result = rule.toObject();

    expect(result.durationSeconds).toBe(0);
  });

  it('UT-MR-010: should restore a metric rule from existing props', () => {
    const createdAt = new Date('2026-08-01T10:00:00.000Z');
    const updatedAt = new Date('2026-08-02T10:00:00.000Z');

    const props: MetricRuleProps = {
      ruleId: 'rule-010',
      assetId: 'asset-001',
      metricType: MetricRuleType.MEMORY_USAGE,
      operator: MetricRuleOperator.GREATER_THAN,
      thresholdValue: 85,
      durationSeconds: 120,
      severity: MetricRuleSeverity.CRITICAL,
      enabled: false,
      archivedAt: null,
      createdAt,
      updatedAt,
    };

    const rule = MetricRule.restore(props);

    const result = rule.toObject();

    expect(result).toEqual(props);
  });

  it('UT-MR-011: should reject invalid props when restoring', () => {
    const props: MetricRuleProps = {
      ruleId: 'rule-011',
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      operator: MetricRuleOperator.GREATER_THAN_OR_EQUAL,
      thresholdValue: 101,
      durationSeconds: 300,
      severity: MetricRuleSeverity.WARNING,
      enabled: true,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(() => MetricRule.restore(props)).toThrow(
      'Threshold value must be between 0 and 100',
    );
  });

  it('UT-MR-012: should disable a metric rule', () => {
    const rule = MetricRule.create('rule-012', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      thresholdValue: 80,
      severity: MetricRuleSeverity.WARNING,
    });

    expect(rule.toObject().enabled).toBe(true);

    rule.disable();

    const result = rule.toObject();

    expect(result.enabled).toBe(false);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('UT-MR-013: should enable a disabled metric rule', () => {
    const rule = MetricRule.create('rule-013', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      thresholdValue: 80,
      severity: MetricRuleSeverity.WARNING,
    });

    rule.disable();

    expect(rule.toObject().enabled).toBe(false);

    rule.enable();

    const result = rule.toObject();

    expect(result.enabled).toBe(true);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('UT-MR-014: should not match when value is below threshold with GREATER_THAN', () => {
    const rule = MetricRule.create('rule-014', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      operator: MetricRuleOperator.GREATER_THAN,
      thresholdValue: 80,
      severity: MetricRuleSeverity.WARNING,
    });

    const result = rule.matches(79);

    expect(result).toBe(false);
  });

  it('UT-MR-015: should not match when value equals threshold with GREATER_THAN', () => {
    const rule = MetricRule.create('rule-015', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      operator: MetricRuleOperator.GREATER_THAN,
      thresholdValue: 80,
      severity: MetricRuleSeverity.WARNING,
    });

    const result = rule.matches(80);

    expect(result).toBe(false);
  });

  it('UT-MR-016: should match when value is above threshold with GREATER_THAN', () => {
    const rule = MetricRule.create('rule-016', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      operator: MetricRuleOperator.GREATER_THAN,
      thresholdValue: 80,
      severity: MetricRuleSeverity.WARNING,
    });

    const result = rule.matches(81);

    expect(result).toBe(true);
  });

  it('UT-MR-017: should not match when value is below threshold with GREATER_THAN_OR_EQUAL', () => {
    const rule = MetricRule.create('rule-017', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      operator: MetricRuleOperator.GREATER_THAN_OR_EQUAL,
      thresholdValue: 80,
      severity: MetricRuleSeverity.WARNING,
    });

    const result = rule.matches(79);

    expect(result).toBe(false);
  });

  it('UT-MR-018: should match when value equals threshold with GREATER_THAN_OR_EQUAL', () => {
    const rule = MetricRule.create('rule-018', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      operator: MetricRuleOperator.GREATER_THAN_OR_EQUAL,
      thresholdValue: 80,
      severity: MetricRuleSeverity.WARNING,
    });

    const result = rule.matches(80);

    expect(result).toBe(true);
  });

  it('UT-MR-019: should match when value is above threshold with GREATER_THAN_OR_EQUAL', () => {
    const rule = MetricRule.create('rule-019', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      operator: MetricRuleOperator.GREATER_THAN_OR_EQUAL,
      thresholdValue: 80,
      severity: MetricRuleSeverity.WARNING,
    });

    const result = rule.matches(81);

    expect(result).toBe(true);
  });

  it('UT-MR-020: should return a copy of internal props', () => {
    const rule = MetricRule.create('rule-020', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      thresholdValue: 80,
      severity: MetricRuleSeverity.WARNING,
    });

    const copiedData = rule.toObject();

    copiedData.thresholdValue = 20;
    copiedData.enabled = false;

    const actualData = rule.toObject();

    expect(actualData.thresholdValue).toBe(80);
    expect(actualData.enabled).toBe(true);
  });

  it('UT-MR-021: should update its evaluation configuration', () => {
    const rule = MetricRule.create('rule-021', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      thresholdValue: 80,
      durationSeconds: 60,
      severity: MetricRuleSeverity.WARNING,
    });

    rule.updateConfiguration({
      metricType: MetricRuleType.MEMORY_USAGE,
      operator: MetricRuleOperator.GREATER_THAN,
      thresholdValue: 90,
      durationSeconds: 120,
      severity: MetricRuleSeverity.CRITICAL,
    });

    expect(rule.toObject()).toMatchObject({
      metricType: MetricRuleType.MEMORY_USAGE,
      operator: MetricRuleOperator.GREATER_THAN,
      thresholdValue: 90,
      durationSeconds: 120,
      severity: MetricRuleSeverity.CRITICAL,
    });
  });

  it('UT-MR-022: should archive and reject later mutations', () => {
    const rule = MetricRule.create('rule-022', {
      assetId: 'asset-001',
      metricType: MetricRuleType.CPU_USAGE,
      thresholdValue: 80,
      severity: MetricRuleSeverity.WARNING,
    });

    rule.archive();

    expect(rule.toObject().enabled).toBe(false);
    expect(rule.toObject().archivedAt).toBeInstanceOf(Date);
    expect(() => rule.enable()).toThrow(
      'Archived metric rule cannot be enabled',
    );
    expect(() =>
      rule.updateConfiguration({
        metricType: MetricRuleType.CPU_USAGE,
        operator: MetricRuleOperator.GREATER_THAN_OR_EQUAL,
        thresholdValue: 70,
        durationSeconds: 30,
        severity: MetricRuleSeverity.WARNING,
      }),
    ).toThrow('Archived metric rule cannot be updated');
  });
});
