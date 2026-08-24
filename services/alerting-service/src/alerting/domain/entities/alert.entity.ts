export type AlertStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CLOSED';

export type AlertSeverity = 'WARNING' | 'CRITICAL';

export type AlertSourceType = 'METRIC_RULE' | 'HEALTH_CHECK';

export type AlertType =
  | 'METRIC_THRESHOLD'
  | 'ENDPOINT_UNAVAILABLE'
  | 'HEALTH_CHECK_STALE';

export type AlertResolutionReason =
  | 'METRIC_RECOVERED'
  | 'HEALTH_CHECK_RECOVERED'
  | 'HEALTH_CHECK_DATA_STALE'
  | 'HEALTH_CHECK_DATA_RESUMED'
  | 'HEALTH_CHECK_TARGET_PAUSED'
  | 'HEALTH_CHECK_TARGET_ARCHIVED'
  | 'ASSET_DEACTIVATED';

export interface AlertProps {
  alertId: string;
  sourceType: AlertSourceType;
  sourceId: string;
  alertType: AlertType;
  dedupKey: string;
  ruleId: string | null;
  assetId: string;
  metricType: string;
  severity: AlertSeverity;
  status: AlertStatus;
  thresholdValue: number | null;
  actualValue: number | null;
  actualText: string | null;
  context: Record<string, unknown> | null;
  message: string;
  triggeredAt: Date;
  resolvedAt: Date | null;
  resolutionReason: AlertResolutionReason | null;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  closedAt: Date | null;
  closedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAlertProps {
  sourceType?: AlertSourceType;
  sourceId?: string;
  alertType?: AlertType;
  dedupKey?: string;
  ruleId?: string | null;
  assetId: string;
  metricType: string;
  severity: AlertSeverity;
  thresholdValue?: number | null;
  actualValue?: number | null;
  actualText?: string | null;
  context?: Record<string, unknown> | null;
  message: string;
  triggeredAt: Date;
}

export class Alert {
  private constructor(private readonly props: AlertProps) {}

  static create(alertId: string, input: CreateAlertProps): Alert {
    const now = new Date();
    const sourceId = input.sourceId ?? input.ruleId;

    if (!sourceId) {
      throw new Error('Alert source ID is required');
    }

    const sourceType = input.sourceType ?? 'METRIC_RULE';
    const alertType = input.alertType ?? 'METRIC_THRESHOLD';

    return new Alert({
      alertId,
      sourceType,
      sourceId,
      alertType,
      dedupKey: input.dedupKey ?? `${sourceType}:${sourceId}:${alertType}`,
      ruleId: input.ruleId ?? (sourceType === 'METRIC_RULE' ? sourceId : null),
      assetId: input.assetId,
      metricType: input.metricType,
      severity: input.severity,
      status: 'TRIGGERED',
      thresholdValue: input.thresholdValue ?? null,
      actualValue: input.actualValue ?? null,
      actualText: input.actualText ?? null,
      context: input.context ?? null,
      message: input.message,
      triggeredAt: input.triggeredAt,
      resolvedAt: null,
      resolutionReason: null,
      acknowledgedAt: null,
      acknowledgedBy: null,
      closedAt: null,
      closedBy: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: AlertProps): Alert {
    return new Alert(props);
  }

  resolve(
    actualValue: number | null,
    resolvedAt: Date,
    resolutionReason: AlertResolutionReason,
    options?: {
      actualText?: string | null;
      message?: string;
      context?: Record<string, unknown> | null;
    },
  ): void {
    if (this.props.status === 'RESOLVED' || this.props.status === 'CLOSED') {
      return;
    }

    this.props.status = 'RESOLVED';
    this.props.actualValue = actualValue;
    this.props.actualText = options?.actualText ?? this.props.actualText;
    this.props.message = options?.message ?? this.props.message;
    this.props.context = options?.context ?? this.props.context;
    this.props.resolutionReason = resolutionReason;
    this.props.resolvedAt = resolvedAt;
    this.props.updatedAt = resolvedAt;
  }
  acknowledge(actorUserId: string, now: Date = new Date()): void {
    if (this.props.status !== 'TRIGGERED') {
      throw new Error(
        `Cannot acknowledge alert with status ${this.props.status}`,
      );
    }

    this.props.status = 'ACKNOWLEDGED';
    this.props.acknowledgedAt = now;
    this.props.acknowledgedBy = actorUserId;
    this.props.updatedAt = now;
  }

  close(actorUserId: string, now: Date = new Date()): void {
    if (this.props.status !== 'RESOLVED') {
      throw new Error(`Cannot close alert with status ${this.props.status}`);
    }

    this.props.status = 'CLOSED';
    this.props.closedAt = now;
    this.props.closedBy = actorUserId;
    this.props.updatedAt = now;
  }

  toObject(): AlertProps {
    return { ...this.props };
  }
}
