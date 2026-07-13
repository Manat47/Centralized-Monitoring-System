export type AlertEventType =
  'METRIC_THRESHOLD_EXCEEDED' | 'METRIC_THRESHOLD_RECOVERED';

export type AlertSeverity = 'WARNING' | 'CRITICAL';

export interface MetricThresholdExceededEvent {
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

export type AlertEvent =
  MetricThresholdExceededEvent | MetricThresholdRecoveredEvent;
