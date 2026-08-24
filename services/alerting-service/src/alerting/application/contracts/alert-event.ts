export type AlertEventType =
  | 'METRIC_THRESHOLD_EXCEEDED'
  | 'METRIC_THRESHOLD_RECOVERED'
  | 'HEALTH_CHECK_RESULT_RECORDED'
  | 'HEALTH_CHECK_TARGET_STATE_CHANGED';

export type AlertSeverity = 'WARNING' | 'CRITICAL';

export interface MetricThresholdExceededEvent {
  eventId: string;
  eventType: 'METRIC_THRESHOLD_EXCEEDED';
  ruleId: string;
  assetId: string;
  metricType: string;
  severity: AlertSeverity;
  thresholdValue: number;
  actualValue: number;
  occurredAt: string;
  message: string;
}

export interface MetricThresholdRecoveredEvent {
  eventId: string;
  eventType: 'METRIC_THRESHOLD_RECOVERED';
  ruleId: string;
  assetId: string;
  metricType: string;
  severity: AlertSeverity;
  thresholdValue: number;
  actualValue: number | null;
  occurredAt: string;
  message: string;
}

export interface HealthCheckResultRecordedEvent {
  eventId: string;
  eventType: 'HEALTH_CHECK_RESULT_RECORDED';
  healthCheckTargetId: string;
  assetId: string;
  url: string;
  checkIntervalSeconds: number;
  statusCode: number | null;
  responseTimeMs: number;
  error: string | null;
  occurredAt: string;
}

export interface HealthCheckTargetStateChangedEvent {
  eventId: string;
  eventType: 'HEALTH_CHECK_TARGET_STATE_CHANGED';
  healthCheckTargetId: string;
  assetId: string;
  url: string;
  checkIntervalSeconds: number;
  state: 'RUNNING' | 'PAUSED' | 'ARCHIVED';
  occurredAt: string;
}

export type AlertEvent =
  | MetricThresholdExceededEvent
  | MetricThresholdRecoveredEvent
  | HealthCheckResultRecordedEvent
  | HealthCheckTargetStateChangedEvent;
