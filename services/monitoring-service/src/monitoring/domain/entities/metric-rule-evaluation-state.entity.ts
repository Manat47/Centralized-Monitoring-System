export type MetricRuleEvaluationStatus =
  | 'NORMAL'
  | 'VIOLATING'
  | 'ALERTED'
  | 'RECOVERED';

export interface MetricRuleEvaluationStateProps {
  stateId: string;
  ruleId: string;
  assetId: string;
  status: MetricRuleEvaluationStatus;
  violatedSince: Date | null;
  lastEvaluatedAt: Date | null;
  lastActualValue: number | null;
  lastTriggeredAt: Date | null;
  recoveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMetricRuleEvaluationStateProps {
  ruleId: string;
  assetId: string;
}

export class MetricRuleEvaluationState {
  private constructor(private readonly props: MetricRuleEvaluationStateProps) {}

  static create(
    stateId: string,
    input: CreateMetricRuleEvaluationStateProps,
  ): MetricRuleEvaluationState {
    const now = new Date();

    const state = new MetricRuleEvaluationState({
      stateId,
      ruleId: input.ruleId,
      assetId: input.assetId,
      status: 'NORMAL',
      violatedSince: null,
      lastEvaluatedAt: null,
      lastActualValue: null,
      lastTriggeredAt: null,
      recoveredAt: null,
      createdAt: now,
      updatedAt: now,
    });

    state.validate();

    return state;
  }

  static restore(
    props: MetricRuleEvaluationStateProps,
  ): MetricRuleEvaluationState {
    const state = new MetricRuleEvaluationState(props);

    state.validate();

    return state;
  }

  markNormal(evaluatedAt: Date, actualValue: number | null): void {
    if (this.props.status === 'VIOLATING' || this.props.status === 'ALERTED') {
      this.props.status = 'RECOVERED';
      this.props.recoveredAt = evaluatedAt;
    } else {
      this.props.status = 'NORMAL';
    }

    this.props.violatedSince = null;
    this.props.lastEvaluatedAt = evaluatedAt;
    this.props.lastActualValue = actualValue;
    this.props.updatedAt = new Date();
  }

  markViolating(evaluatedAt: Date, actualValue: number): void {
    if (this.props.status === 'NORMAL' || this.props.status === 'RECOVERED') {
      this.props.status = 'VIOLATING';
      this.props.violatedSince = evaluatedAt;
      this.props.recoveredAt = null;
    }

    this.props.lastEvaluatedAt = evaluatedAt;
    this.props.lastActualValue = actualValue;
    this.props.updatedAt = new Date();
  }

  shouldTriggerAlert(evaluatedAt: Date, durationSeconds: number): boolean {
    if (this.props.status !== 'VIOLATING') {
      return false;
    }

    if (!this.props.violatedSince) {
      return false;
    }

    const elapsedSeconds =
      (evaluatedAt.getTime() - this.props.violatedSince.getTime()) / 1000;

    return elapsedSeconds >= durationSeconds;
  }

  markAlerted(triggeredAt: Date): void {
    this.props.status = 'ALERTED';
    this.props.lastTriggeredAt = triggeredAt;
    this.props.lastEvaluatedAt = triggeredAt;
    this.props.updatedAt = new Date();
  }

  toObject(): MetricRuleEvaluationStateProps {
    return {
      ...this.props,
    };
  }

  private validate(): void {
    if (!this.props.ruleId.trim()) {
      throw new Error('Rule ID is required');
    }

    if (!this.props.assetId.trim()) {
      throw new Error('Asset ID is required');
    }
  }
}
