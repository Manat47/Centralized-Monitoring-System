import { describe, expect, it } from '@jest/globals';
import { MetricRuleEvaluationState } from './metric-rule-evaluation-state.entity';

describe('MetricRuleEvaluationState', () => {
  it('UT-MRES-001: should create evaluation state with default values', () => {
    const state = MetricRuleEvaluationState.create('state-001', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const result = state.toObject();

    expect(result.stateId).toBe('state-001');
    expect(result.ruleId).toBe('rule-001');
    expect(result.assetId).toBe('asset-001');

    expect(result.status).toBe('NORMAL');
    expect(result.violatedSince).toBeNull();
    expect(result.lastEvaluatedAt).toBeNull();
    expect(result.lastActualValue).toBeNull();
    expect(result.lastTriggeredAt).toBeNull();
    expect(result.recoveredAt).toBeNull();

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it.each(['', '   '])(
    'UT-MRES-002: should reject empty ruleId: "%s"',
    (ruleId) => {
      expect(() =>
        MetricRuleEvaluationState.create('state-002', {
          ruleId,
          assetId: 'asset-001',
        }),
      ).toThrow('Rule ID is required');
    },
  );

  it.each(['', '   '])(
    'UT-MRES-003: should reject empty assetId: "%s"',
    (assetId) => {
      expect(() =>
        MetricRuleEvaluationState.create('state-003', {
          ruleId: 'rule-001',
          assetId,
        }),
      ).toThrow('Asset ID is required');
    },
  );

  it('UT-MRES-004: should restore evaluation state from existing props', () => {
    const now = new Date();

    const props = {
      stateId: 'state-004',
      ruleId: 'rule-001',
      assetId: 'asset-001',
      status: 'VIOLATING' as const,
      violatedSince: now,
      lastEvaluatedAt: now,
      lastActualValue: 85,
      lastTriggeredAt: null,
      recoveredAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const state = MetricRuleEvaluationState.restore(props);

    const result = state.toObject();

    expect(result).toEqual(props);
  });

  it('UT-MRES-005: should reject invalid props when restoring', () => {
    const now = new Date();

    const baseProps = {
      stateId: 'state-005',
      ruleId: 'rule-001',
      assetId: 'asset-001',
      status: 'NORMAL' as const,
      violatedSince: null,
      lastEvaluatedAt: null,
      lastActualValue: null,
      lastTriggeredAt: null,
      recoveredAt: null,
      createdAt: now,
      updatedAt: now,
    };

    expect(() =>
      MetricRuleEvaluationState.restore({
        ...baseProps,
        ruleId: '',
      }),
    ).toThrow('Rule ID is required');

    expect(() =>
      MetricRuleEvaluationState.restore({
        ...baseProps,
        assetId: '   ',
      }),
    ).toThrow('Asset ID is required');
  });

  it('UT-MRES-006: should remain NORMAL when marked normal', () => {
    const state = MetricRuleEvaluationState.create('state-006', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const evaluatedAt = new Date('2026-08-07T10:00:00.000Z');

    state.markNormal(evaluatedAt, 42);

    const result = state.toObject();

    expect(result.status).toBe('NORMAL');
    expect(result.lastEvaluatedAt).toEqual(evaluatedAt);
    expect(result.lastActualValue).toBe(42);
    expect(result.violatedSince).toBeNull();
    expect(result.recoveredAt).toBeNull();
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('UT-MRES-007: should change VIOLATING to RECOVERED when marked normal', () => {
    const state = MetricRuleEvaluationState.create('state-007', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const violatingAt = new Date('2026-08-07T10:00:00.000Z');
    const recoveredAt = new Date('2026-08-07T10:01:00.000Z');

    state.markViolating(violatingAt, 85);
    state.markNormal(recoveredAt, 40);

    const result = state.toObject();

    expect(result.status).toBe('RECOVERED');
    expect(result.recoveredAt).toEqual(recoveredAt);
    expect(result.violatedSince).toBeNull();
    expect(result.lastEvaluatedAt).toEqual(recoveredAt);
    expect(result.lastActualValue).toBe(40);
  });

  it('UT-MRES-008: should change ALERTED to RECOVERED when marked normal', () => {
    const state = MetricRuleEvaluationState.create('state-008', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const violatingAt = new Date('2026-08-07T10:00:00.000Z');
    const triggeredAt = new Date('2026-08-07T10:01:00.000Z');
    const recoveredAt = new Date('2026-08-07T10:02:00.000Z');

    state.markViolating(violatingAt, 85);
    state.markAlerted(triggeredAt);
    state.markNormal(recoveredAt, 40);

    const result = state.toObject();

    expect(result.status).toBe('RECOVERED');
    expect(result.recoveredAt).toEqual(recoveredAt);
    expect(result.violatedSince).toBeNull();
    expect(result.lastEvaluatedAt).toEqual(recoveredAt);
    expect(result.lastActualValue).toBe(40);
  });

  it('UT-MRES-009: should change RECOVERED back to NORMAL on next normal evaluation', () => {
    const state = MetricRuleEvaluationState.create('state-009', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const violatingAt = new Date('2026-08-07T10:00:00.000Z');
    const firstNormalAt = new Date('2026-08-07T10:01:00.000Z');
    const secondNormalAt = new Date('2026-08-07T10:02:00.000Z');

    state.markViolating(violatingAt, 85);
    state.markNormal(firstNormalAt, 40);

    expect(state.toObject().status).toBe('RECOVERED');

    state.markNormal(secondNormalAt, 35);

    const result = state.toObject();

    expect(result.status).toBe('NORMAL');
    expect(result.lastEvaluatedAt).toEqual(secondNormalAt);
    expect(result.lastActualValue).toBe(35);
    expect(result.violatedSince).toBeNull();
  });

  it('UT-MRES-010: should change NORMAL to VIOLATING', () => {
    const state = MetricRuleEvaluationState.create('state-010', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const evaluatedAt = new Date('2026-08-07T10:00:00.000Z');

    state.markViolating(evaluatedAt, 85);

    const result = state.toObject();

    expect(result.status).toBe('VIOLATING');
    expect(result.violatedSince).toEqual(evaluatedAt);
    expect(result.lastEvaluatedAt).toEqual(evaluatedAt);
    expect(result.lastActualValue).toBe(85);
    expect(result.recoveredAt).toBeNull();
  });

  it('UT-MRES-011: should start new VIOLATING state from RECOVERED', () => {
    const state = MetricRuleEvaluationState.create('state-011', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const firstViolatingAt = new Date('2026-08-07T10:00:00.000Z');
    const recoveredAt = new Date('2026-08-07T10:01:00.000Z');
    const secondViolatingAt = new Date('2026-08-07T10:02:00.000Z');

    state.markViolating(firstViolatingAt, 85);
    state.markNormal(recoveredAt, 40);
    state.markViolating(secondViolatingAt, 90);

    const result = state.toObject();

    expect(result.status).toBe('VIOLATING');
    expect(result.violatedSince).toEqual(secondViolatingAt);
    expect(result.recoveredAt).toBeNull();
    expect(result.lastEvaluatedAt).toEqual(secondViolatingAt);
    expect(result.lastActualValue).toBe(90);
  });

  it('UT-MRES-011: should start new VIOLATING state from RECOVERED', () => {
    const state = MetricRuleEvaluationState.create('state-011', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const firstViolatingAt = new Date('2026-08-07T10:00:00.000Z');
    const recoveredAt = new Date('2026-08-07T10:01:00.000Z');
    const secondViolatingAt = new Date('2026-08-07T10:02:00.000Z');

    state.markViolating(firstViolatingAt, 85);
    state.markNormal(recoveredAt, 40);
    state.markViolating(secondViolatingAt, 90);

    const result = state.toObject();

    expect(result.status).toBe('VIOLATING');
    expect(result.violatedSince).toEqual(secondViolatingAt);
    expect(result.recoveredAt).toBeNull();
    expect(result.lastEvaluatedAt).toEqual(secondViolatingAt);
    expect(result.lastActualValue).toBe(90);
  });

  it('UT-MRES-012: should preserve violatedSince while still VIOLATING', () => {
    const state = MetricRuleEvaluationState.create('state-012', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const firstEvaluatedAt = new Date('2026-08-07T10:00:00.000Z');
    const secondEvaluatedAt = new Date('2026-08-07T10:01:00.000Z');

    state.markViolating(firstEvaluatedAt, 85);
    state.markViolating(secondEvaluatedAt, 90);

    const result = state.toObject();

    expect(result.status).toBe('VIOLATING');
    expect(result.violatedSince).toEqual(firstEvaluatedAt);
    expect(result.lastEvaluatedAt).toEqual(secondEvaluatedAt);
    expect(result.lastActualValue).toBe(90);
  });

  it('UT-MRES-013: should remain ALERTED when marked violating again', () => {
    const state = MetricRuleEvaluationState.create('state-013', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const violatingAt = new Date('2026-08-07T10:00:00.000Z');
    const triggeredAt = new Date('2026-08-07T10:01:00.000Z');
    const nextEvaluatedAt = new Date('2026-08-07T10:02:00.000Z');

    state.markViolating(violatingAt, 85);
    state.markAlerted(triggeredAt);
    state.markViolating(nextEvaluatedAt, 90);

    const result = state.toObject();

    expect(result.status).toBe('ALERTED');
    expect(result.violatedSince).toEqual(violatingAt);
    expect(result.lastEvaluatedAt).toEqual(nextEvaluatedAt);
    expect(result.lastActualValue).toBe(90);
  });

  it('UT-MRES-014: should not trigger alert when status is not VIOLATING', () => {
    const state = MetricRuleEvaluationState.create('state-014', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const evaluatedAt = new Date('2026-08-07T10:05:00.000Z');

    expect(state.shouldTriggerAlert(evaluatedAt, 60)).toBe(false);

    state.markViolating(new Date('2026-08-07T10:00:00.000Z'), 85);

    state.markAlerted(new Date('2026-08-07T10:01:00.000Z'));

    expect(state.shouldTriggerAlert(evaluatedAt, 60)).toBe(false);

    state.markNormal(new Date('2026-08-07T10:02:00.000Z'), 40);

    expect(state.shouldTriggerAlert(evaluatedAt, 60)).toBe(false);
  });

  it('UT-MRES-015: should not trigger alert when violatedSince is null', () => {
    const now = new Date();

    const state = MetricRuleEvaluationState.restore({
      stateId: 'state-015',
      ruleId: 'rule-001',
      assetId: 'asset-001',
      status: 'VIOLATING',
      violatedSince: null,
      lastEvaluatedAt: null,
      lastActualValue: null,
      lastTriggeredAt: null,
      recoveredAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const evaluatedAt = new Date('2026-08-07T10:05:00.000Z');

    const result = state.shouldTriggerAlert(evaluatedAt, 60);

    expect(result).toBe(false);
  });

  it('UT-MRES-016: should not trigger alert before duration is reached', () => {
    const state = MetricRuleEvaluationState.create('state-016', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const violatedSince = new Date('2026-08-07T10:00:00.000Z');
    const evaluatedAt = new Date('2026-08-07T10:00:59.000Z');

    state.markViolating(violatedSince, 85);

    const result = state.shouldTriggerAlert(evaluatedAt, 60);

    expect(result).toBe(false);
  });

  it('UT-MRES-017: should trigger alert exactly when duration is reached', () => {
    const state = MetricRuleEvaluationState.create('state-017', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const violatedSince = new Date('2026-08-07T10:00:00.000Z');
    const evaluatedAt = new Date('2026-08-07T10:01:00.000Z');

    state.markViolating(violatedSince, 85);

    const result = state.shouldTriggerAlert(evaluatedAt, 60);

    expect(result).toBe(true);
  });

  it('UT-MRES-018: should trigger alert after duration is exceeded', () => {
    const state = MetricRuleEvaluationState.create('state-018', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const violatedSince = new Date('2026-08-07T10:00:00.000Z');
    const evaluatedAt = new Date('2026-08-07T10:01:30.000Z');

    state.markViolating(violatedSince, 85);

    const result = state.shouldTriggerAlert(evaluatedAt, 60);

    expect(result).toBe(true);
  });

  it('UT-MRES-019: should trigger alert immediately when duration is 0', () => {
    const state = MetricRuleEvaluationState.create('state-019', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const evaluatedAt = new Date('2026-08-07T10:00:00.000Z');

    state.markViolating(evaluatedAt, 85);

    const result = state.shouldTriggerAlert(evaluatedAt, 0);

    expect(result).toBe(true);
  });

  it('UT-MRES-020: should mark state as ALERTED', () => {
    const state = MetricRuleEvaluationState.create('state-020', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const triggeredAt = new Date('2026-08-07T10:01:00.000Z');

    state.markAlerted(triggeredAt);

    const result = state.toObject();

    expect(result.status).toBe('ALERTED');
    expect(result.lastTriggeredAt).toEqual(triggeredAt);
    expect(result.lastEvaluatedAt).toEqual(triggeredAt);
  });

  it('UT-MRES-021: should support null actualValue when marked normal', () => {
    const state = MetricRuleEvaluationState.create('state-021', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const evaluatedAt = new Date('2026-08-07T10:00:00.000Z');

    state.markNormal(evaluatedAt, null);

    const result = state.toObject();

    expect(result.status).toBe('NORMAL');
    expect(result.lastEvaluatedAt).toEqual(evaluatedAt);
    expect(result.lastActualValue).toBeNull();
  });

  it('UT-MRES-022: should return a shallow copy from toObject', () => {
    const state = MetricRuleEvaluationState.create('state-022', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });

    const first = state.toObject();
    const second = state.toObject();

    expect(first).not.toBe(second);

    first.status = 'ALERTED';
    first.lastActualValue = 99;

    const result = state.toObject();

    expect(result.status).toBe('NORMAL');
    expect(result.lastActualValue).toBeNull();
  });

  it('UT-MRES-023: should preserve an alert when metric data is missing', () => {
    const state = MetricRuleEvaluationState.create('state-023', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });
    state.markViolating(new Date('2026-08-07T10:00:00.000Z'), 95);
    state.markAlerted(new Date('2026-08-07T10:01:00.000Z'));

    const evaluatedAt = new Date('2026-08-07T10:02:00.000Z');
    state.markNoData(evaluatedAt);

    expect(state.toObject()).toMatchObject({
      status: 'ALERTED',
      lastEvaluatedAt: evaluatedAt,
      lastActualValue: null,
    });
  });

  it('UT-MRES-024: should reset evaluation state for a fresh lifecycle', () => {
    const state = MetricRuleEvaluationState.create('state-024', {
      ruleId: 'rule-001',
      assetId: 'asset-001',
    });
    state.markViolating(new Date('2026-08-07T10:00:00.000Z'), 95);
    state.markAlerted(new Date('2026-08-07T10:01:00.000Z'));

    state.reset(new Date('2026-08-07T10:02:00.000Z'));

    expect(state.toObject()).toMatchObject({
      status: 'NORMAL',
      violatedSince: null,
      lastEvaluatedAt: null,
      lastActualValue: null,
      lastTriggeredAt: null,
      recoveredAt: null,
    });
  });
});
