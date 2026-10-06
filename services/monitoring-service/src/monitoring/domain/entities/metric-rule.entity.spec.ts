import {
  MetricRule,
  MetricRuleOperator,
  MetricRuleType,
} from './metric-rule.entity';

const base = {
  assetId: 'asset-1',
  metricType: MetricRuleType.CPU_USAGE,
  warningThreshold: 35,
  criticalThreshold: 80,
};

describe('MetricRule multi-tier invariant', () => {
  it('creates one rule with both tiers and defaults', () => {
    const rule = MetricRule.create('rule-1', base);
    expect(rule.toObject()).toMatchObject({
      operator: '>=',
      warningThreshold: 35,
      warningEnabled: true,
      warningDurationSeconds: 30,
      criticalThreshold: 80,
      criticalDurationSeconds: 60,
      enabled: true,
    });
    expect(rule.matches(40, 35)).toBe(true);
    expect(rule.matches(40, 80)).toBe(false);
  });

  it('rejects an inverted or equal increasing threshold pair', () => {
    expect(() =>
      MetricRule.create('rule-2', {
        ...base,
        warningThreshold: 85,
        criticalThreshold: 70,
      }),
    ).toThrow('Warning threshold must be below critical threshold');
    expect(() =>
      MetricRule.create('rule-2', {
        ...base,
        warningThreshold: 80,
        criticalThreshold: 80,
      }),
    ).toThrow('Warning threshold must be below critical threshold');
  });

  it('creates a critical-only rule without a warning threshold', () => {
    const rule = MetricRule.create('rule-critical-only', {
      assetId: base.assetId,
      metricType: base.metricType,
      warningEnabled: false,
      criticalThreshold: 80,
    });
    expect(rule.toObject()).toMatchObject({
      warningEnabled: false,
      warningThreshold: 80,
      criticalThreshold: 80,
    });
    expect(() =>
      MetricRule.create('rule-missing-warning', {
        assetId: base.assetId,
        metricType: base.metricType,
        criticalThreshold: 80,
      }),
    ).toThrow('Warning threshold is required when Warning is enabled');
  });

  it('requires decreasing threshold order for < and <=', () => {
    const rule = MetricRule.create('rule-3', {
      ...base,
      operator: MetricRuleOperator.LESS_THAN,
      warningThreshold: 40,
      criticalThreshold: 20,
    });
    expect(rule.matches(30, 40)).toBe(true);
    expect(rule.matches(20, 20)).toBe(false);
    expect(() =>
      MetricRule.create('rule-4', {
        ...base,
        operator: MetricRuleOperator.LESS_THAN_OR_EQUAL,
      }),
    ).toThrow('Warning threshold must be above critical threshold');
  });

  it('accepts a decreasing <= pair and includes the threshold boundary', () => {
    const rule = MetricRule.create('rule-less-than-or-equal', {
      ...base,
      operator: MetricRuleOperator.LESS_THAN_OR_EQUAL,
      warningThreshold: 90,
      criticalThreshold: 80,
    });
    expect(rule.matches(90, 90)).toBe(true);
    expect(rule.matches(81, 80)).toBe(false);
    expect(rule.matches(80, 80)).toBe(true);
  });

  it('rejects out-of-range values and durations below ten seconds', () => {
    expect(() =>
      MetricRule.create('rule-5', { ...base, warningThreshold: -1 }),
    ).toThrow('Threshold must be between 0 and 100');
    expect(() =>
      MetricRule.create('rule-6', { ...base, criticalDurationSeconds: 5 }),
    ).toThrow('Duration seconds must be at least 10');
  });

  it('validates updates before mutating the current rule', () => {
    const rule = MetricRule.create('rule-7', base);
    expect(() =>
      rule.updateConfiguration({
        metricType: MetricRuleType.CPU_USAGE,
        operator: MetricRuleOperator.GREATER_THAN_OR_EQUAL,
        warningEnabled: true,
        warningThreshold: 90,
        warningDurationSeconds: 30,
        criticalThreshold: 80,
        criticalDurationSeconds: 60,
      }),
    ).toThrow('Warning threshold must be below critical threshold');
    expect(rule.toObject().warningThreshold).toBe(35);
  });

  it('allows archived history while disallowing further edits', () => {
    const rule = MetricRule.create('rule-8', base);
    rule.archive();
    expect(rule.toObject().archivedAt).toBeInstanceOf(Date);
    expect(rule.toObject().enabled).toBe(false);
    expect(() => rule.enable()).toThrow(
      'Archived metric rule cannot be enabled',
    );
  });
});
