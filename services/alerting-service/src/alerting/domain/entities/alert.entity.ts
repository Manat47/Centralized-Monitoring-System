export type AlertStatus = 'TRIGGERED' | 'RESOLVED';

export type AlertSeverity = 'WARNING' | 'CRITICAL';

export interface AlertProps {
  alertId: string;
  ruleId: string;
  assetId: string;
  metricType: string;
  severity: AlertSeverity;
  status: AlertStatus;
  thresholdValue: number;
  actualValue: number | null;
  message: string;
  triggeredAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAlertProps {
  ruleId: string;
  assetId: string;
  metricType: string;
  severity: AlertSeverity;
  thresholdValue: number;
  actualValue: number;
  message: string;
  triggeredAt: Date;
}

export class Alert {
  private constructor(private readonly props: AlertProps) {}

  static create(alertId: string, input: CreateAlertProps): Alert {
    const now = new Date();

    return new Alert({
      alertId,
      ruleId: input.ruleId,
      assetId: input.assetId,
      metricType: input.metricType,
      severity: input.severity,
      status: 'TRIGGERED',
      thresholdValue: input.thresholdValue,
      actualValue: input.actualValue,
      message: input.message,
      triggeredAt: input.triggeredAt,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: AlertProps): Alert {
    return new Alert(props);
  }

  resolve(actualValue: number | null, resolvedAt: Date): void {
    if (this.props.status === 'RESOLVED') {
      return;
    }

    this.props.status = 'RESOLVED';
    this.props.actualValue = actualValue;
    this.props.resolvedAt = resolvedAt;
    this.props.updatedAt = resolvedAt;
  }

  toObject(): AlertProps {
    return { ...this.props };
  }
}
