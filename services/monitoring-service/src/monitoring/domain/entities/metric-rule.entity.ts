export enum MetricRuleType {
  CPU_USAGE = 'CPU_USAGE',
  MEMORY_USAGE = 'MEMORY_USAGE',
  DISK_USAGE = 'DISK_USAGE',
}

export enum MetricRuleOperator {
  GREATER_THAN = 'GREATER_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
}

export enum MetricRuleSeverity {
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface MetricRuleProps {
  ruleId: string;
  assetId: string;
  metricType: MetricRuleType;
  operator: MetricRuleOperator;
  thresholdValue: number;
  durationSeconds: number;
  severity: MetricRuleSeverity;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMetricRuleProps {
  assetId: string;
  metricType: MetricRuleType;
  operator?: MetricRuleOperator;
  thresholdValue: number;
  durationSeconds?: number;
  severity: MetricRuleSeverity;
}

export class MetricRule {
  private constructor(private readonly props: MetricRuleProps) {}

  static create(ruleId: string, input: CreateMetricRuleProps): MetricRule {
    const now = new Date();

    const rule = new MetricRule({
      ruleId,
      assetId: input.assetId,
      metricType: input.metricType,
      operator: input.operator ?? MetricRuleOperator.GREATER_THAN_OR_EQUAL,
      thresholdValue: input.thresholdValue,
      durationSeconds: input.durationSeconds ?? 300,
      severity: input.severity,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    rule.validate();

    return rule;
  }

  static restore(props: MetricRuleProps): MetricRule {
    const rule = new MetricRule(props);
    rule.validate();
    return rule;
  }

  disable(): void {
    this.props.enabled = false;
    this.props.updatedAt = new Date();
  }

  enable(): void {
    this.props.enabled = true;
    this.props.updatedAt = new Date();
  }

  matches(value: number): boolean {
    if (this.props.operator === MetricRuleOperator.GREATER_THAN) {
      return value > this.props.thresholdValue;
    }

    return value >= this.props.thresholdValue;
  }

  toObject(): MetricRuleProps {
    return {
      ...this.props,
    };
  }

  private validate(): void {
    if (!this.props.assetId.trim()) {
      throw new Error('Asset ID is required');
    }

    if (this.props.thresholdValue < 0 || this.props.thresholdValue > 100) {
      throw new Error('Threshold value must be between 0 and 100');
    }

    if (this.props.durationSeconds < 0) {
      throw new Error('Duration seconds must be greater than or equal to 0');
    }
  }
}
