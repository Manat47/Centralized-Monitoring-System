export type AlertStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CLOSED';

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
  acknowledgedAt: Date | null;
  closedAt: Date | null;
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
      acknowledgedAt: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: AlertProps): Alert {
    return new Alert(props);
  }

  resolve(actualValue: number | null, resolvedAt: Date): void {
    if (this.props.status === 'RESOLVED' || this.props.status === 'CLOSED') {
      return;
    }

    this.props.status = 'RESOLVED';
    this.props.actualValue = actualValue;
    this.props.resolvedAt = resolvedAt;
    this.props.updatedAt = resolvedAt;
  }
  acknowledge(now: Date = new Date()): void {
    if (this.props.status !== 'TRIGGERED') {
      throw new Error(
        `Cannot acknowledge alert with status ${this.props.status}`,
      );
    }

    this.props.status = 'ACKNOWLEDGED';
    this.props.acknowledgedAt = now;
    this.props.updatedAt = now;
  }

  close(now: Date = new Date()): void {
    if (this.props.status !== 'RESOLVED') {
      throw new Error(`Cannot close alert with status ${this.props.status}`);
    }

    this.props.status = 'CLOSED';
    this.props.closedAt = now;
    this.props.updatedAt = now;
  }

  toObject(): AlertProps {
    return { ...this.props };
  }
}
