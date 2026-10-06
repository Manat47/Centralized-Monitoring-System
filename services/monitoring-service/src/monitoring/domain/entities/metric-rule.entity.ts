export enum MetricRuleType {
  CPU_USAGE = 'CPU_USAGE',
  MEMORY_USAGE = 'MEMORY_USAGE',
  DISK_USAGE = 'DISK_USAGE',
}

export enum MetricRuleOperator {
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
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
  warningEnabled: boolean;
  warningThreshold: number;
  warningDurationSeconds: number;
  criticalThreshold: number;
  criticalDurationSeconds: number;
  enabled: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMetricRuleProps {
  assetId: string;
  metricType: MetricRuleType;
  operator?: MetricRuleOperator;
  warningEnabled?: boolean;
  warningThreshold?: number;
  warningDurationSeconds?: number;
  criticalThreshold: number;
  criticalDurationSeconds?: number;
}

export class MetricRule {
  private constructor(private readonly props: MetricRuleProps) {}

  static create(ruleId: string, input: CreateMetricRuleProps): MetricRule {
    const warningEnabled = input.warningEnabled ?? true;
    if (warningEnabled && input.warningThreshold == null) {
      throw new Error('Warning threshold is required when Warning is enabled');
    }
    const now = new Date();
    const rule = new MetricRule({
      ruleId,
      assetId: input.assetId,
      metricType: input.metricType,
      operator: input.operator ?? MetricRuleOperator.GREATER_THAN_OR_EQUAL,
      warningEnabled,
      warningThreshold: input.warningThreshold ?? input.criticalThreshold,
      warningDurationSeconds: input.warningDurationSeconds ?? 30,
      criticalThreshold: input.criticalThreshold,
      criticalDurationSeconds: input.criticalDurationSeconds ?? 60,
      enabled: true,
      archivedAt: null,
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
    if (this.props.archivedAt) {
      throw new Error('Archived metric rule cannot be enabled');
    }
    this.props.enabled = true;
    this.props.updatedAt = new Date();
  }

  updateConfiguration(input: {
    metricType: MetricRuleType;
    operator: MetricRuleOperator;
    warningEnabled: boolean;
    warningThreshold: number;
    warningDurationSeconds: number;
    criticalThreshold: number;
    criticalDurationSeconds: number;
  }): void {
    if (this.props.archivedAt) {
      throw new Error('Archived metric rule cannot be updated');
    }
    const next = { ...this.props, ...input };
    MetricRule.validateProps(next);
    Object.assign(this.props, input, { updatedAt: new Date() });
  }

  archive(): void {
    if (this.props.archivedAt) {
      throw new Error('Metric rule is already archived');
    }
    const now = new Date();
    this.props.enabled = false;
    this.props.archivedAt = now;
    this.props.updatedAt = now;
  }

  matches(value: number, threshold: number): boolean {
    switch (this.props.operator) {
      case MetricRuleOperator.GREATER_THAN:
        return value > threshold;
      case MetricRuleOperator.GREATER_THAN_OR_EQUAL:
        return value >= threshold;
      case MetricRuleOperator.LESS_THAN:
        return value < threshold;
      case MetricRuleOperator.LESS_THAN_OR_EQUAL:
        return value <= threshold;
    }
  }

  toObject(): MetricRuleProps {
    return { ...this.props };
  }

  private validate(): void {
    MetricRule.validateProps(this.props);
  }

  private static validateProps(props: MetricRuleProps): void {
    if (!props.assetId.trim()) throw new Error('Asset ID is required');
    if (!Object.values(MetricRuleType).includes(props.metricType)) {
      throw new Error('Invalid metric type');
    }
    if (!Object.values(MetricRuleOperator).includes(props.operator)) {
      throw new Error('Invalid comparison operator');
    }
    for (const threshold of [props.warningThreshold, props.criticalThreshold]) {
      if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
        throw new Error('Threshold must be between 0 and 100');
      }
    }
    for (const duration of [
      props.warningDurationSeconds,
      props.criticalDurationSeconds,
    ]) {
      if (!Number.isInteger(duration) || duration < 10) {
        throw new Error('Duration seconds must be at least 10');
      }
    }
    const increasing =
      props.operator === MetricRuleOperator.GREATER_THAN ||
      props.operator === MetricRuleOperator.GREATER_THAN_OR_EQUAL;
    if (
      props.warningEnabled &&
      increasing &&
      props.warningThreshold >= props.criticalThreshold
    ) {
      throw new Error('Warning threshold must be below critical threshold');
    }
    if (
      props.warningEnabled &&
      !increasing &&
      props.warningThreshold <= props.criticalThreshold
    ) {
      throw new Error('Warning threshold must be above critical threshold');
    }
  }
}
