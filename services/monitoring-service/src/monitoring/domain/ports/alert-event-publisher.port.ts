export type AlertEventType =
  | 'METRIC_THRESHOLD_EXCEEDED'
  | 'METRIC_THRESHOLD_RECOVERED'
  | 'METRIC_RULE_STATE_CHANGED'
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
  occurredAt: Date;
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
  occurredAt: Date;
  message: string;
}

export interface MetricRuleStateChangedEvent {
  eventId: string;
  eventType: 'METRIC_RULE_STATE_CHANGED';
  ruleId: string;
  assetId: string;
  state: 'UPDATED' | 'DISABLED' | 'ARCHIVED';
  occurredAt: Date;
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
  occurredAt: Date;
}

export interface HealthCheckTargetStateChangedEvent {
  eventId: string;
  eventType: 'HEALTH_CHECK_TARGET_STATE_CHANGED';
  healthCheckTargetId: string;
  assetId: string;
  url: string;
  checkIntervalSeconds: number;
  state: 'RUNNING' | 'PAUSED' | 'ARCHIVED';
  occurredAt: Date;
}

export type AlertEvent =
  | MetricThresholdExceededEvent
  | MetricThresholdRecoveredEvent
  | MetricRuleStateChangedEvent
  | HealthCheckResultRecordedEvent
  | HealthCheckTargetStateChangedEvent;

export const ALERT_EVENT_PUBLISHER = Symbol('ALERT_EVENT_PUBLISHER');

export interface AlertEventPublisher {
  publish(event: AlertEvent): Promise<void>;
}
