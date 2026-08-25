import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  Alert,
  type AlertResolutionReason,
} from '../../domain/entities/alert.entity';
import { HealthCheckAlertState } from '../../domain/entities/health-check-alert-state.entity';
import {
  NOTIFICATION_EVENT_PUBLISHER,
  type NotificationEventPublisher,
} from '../../domain/port/notification-event-publisher.port';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/repositories/alert.repository';
import {
  HEALTH_CHECK_ALERT_STATE_REPOSITORY,
  type HealthCheckAlertStateRepository,
} from '../../domain/repositories/health-check-alert-state.repository';
import type {
  AlertEvent,
  HealthCheckResultRecordedEvent,
  HealthCheckTargetStateChangedEvent,
  MetricThresholdExceededEvent,
  MetricThresholdRecoveredEvent,
  MetricRuleStateChangedEvent,
} from '../contracts/alert-event';

const HEALTH_FAILURE_THRESHOLD = 2;
const HEALTH_RECOVERY_THRESHOLD = 2;

@Injectable()
export class ProcessAlertEventUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,
    @Inject(HEALTH_CHECK_ALERT_STATE_REPOSITORY)
    private readonly healthStateRepository: HealthCheckAlertStateRepository,
    @Inject(NOTIFICATION_EVENT_PUBLISHER)
    private readonly notificationEventPublisher: NotificationEventPublisher,
  ) {}

  async execute(event: AlertEvent): Promise<Alert | null> {
    const claimed = await this.alertRepository.claimEvent(event.eventId);

    if (!claimed) {
      return null;
    }

    try {
      if (event.eventType === 'METRIC_THRESHOLD_EXCEEDED') {
        return await this.processMetricExceeded(event);
      }

      if (event.eventType === 'METRIC_THRESHOLD_RECOVERED') {
        return await this.processMetricRecovered(event);
      }

      if (event.eventType === 'METRIC_RULE_STATE_CHANGED') {
        return await this.processMetricRuleStateChanged(event);
      }

      if (event.eventType === 'HEALTH_CHECK_TARGET_STATE_CHANGED') {
        await this.processHealthTargetStateChanged(event);
        return null;
      }

      return await this.processHealthResult(event);
    } catch (error) {
      await this.alertRepository.releaseEvent(event.eventId);
      throw error;
    }
  }

  private async processMetricExceeded(
    event: MetricThresholdExceededEvent,
  ): Promise<Alert> {
    const dedupKey = `METRIC_RULE:${event.ruleId}:METRIC_THRESHOLD`;
    const existingAlert =
      await this.alertRepository.findActiveByDedupKey(dedupKey);

    if (existingAlert) {
      return existingAlert;
    }

    const alert = Alert.create(randomUUID(), {
      sourceType: 'METRIC_RULE',
      sourceId: event.ruleId,
      alertType: 'METRIC_THRESHOLD',
      dedupKey,
      ruleId: event.ruleId,
      assetId: event.assetId,
      metricType: event.metricType,
      severity: event.severity,
      thresholdValue: event.thresholdValue,
      actualValue: event.actualValue,
      message: event.message,
      triggeredAt: new Date(event.occurredAt),
    });

    return this.createAlert(alert);
  }

  private async processMetricRecovered(
    event: MetricThresholdRecoveredEvent,
  ): Promise<Alert | null> {
    const activeAlert = await this.alertRepository.findActiveByDedupKey(
      `METRIC_RULE:${event.ruleId}:METRIC_THRESHOLD`,
    );

    if (!activeAlert) {
      return null;
    }

    return this.resolveAlert(
      activeAlert,
      event.actualValue,
      new Date(event.occurredAt),
      'METRIC_RECOVERED',
      event.message,
    );
  }

  private async processMetricRuleStateChanged(
    event: MetricRuleStateChangedEvent,
  ): Promise<Alert | null> {
    const activeAlert = await this.alertRepository.findActiveByDedupKey(
      `METRIC_RULE:${event.ruleId}:METRIC_THRESHOLD`,
    );

    if (!activeAlert) {
      return null;
    }

    const reason = {
      UPDATED: 'METRIC_RULE_UPDATED',
      DISABLED: 'METRIC_RULE_DISABLED',
      ARCHIVED: 'METRIC_RULE_ARCHIVED',
    }[event.state] as AlertResolutionReason;

    return this.resolveAlert(
      activeAlert,
      null,
      new Date(event.occurredAt),
      reason,
      event.message,
    );
  }

  private async processHealthTargetStateChanged(
    event: HealthCheckTargetStateChangedEvent,
  ): Promise<void> {
    let state = await this.healthStateRepository.findByTargetId(
      event.healthCheckTargetId,
    );

    if (!state) {
      state = HealthCheckAlertState.create({
        healthCheckTargetId: event.healthCheckTargetId,
        assetId: event.assetId,
        url: event.url,
        checkIntervalSeconds: event.checkIntervalSeconds,
      });
    }

    state.configure({
      assetId: event.assetId,
      url: event.url,
      checkIntervalSeconds: event.checkIntervalSeconds,
      enabled: event.state === 'RUNNING',
      archived: event.state === 'ARCHIVED',
      occurredAt: new Date(event.occurredAt),
    });

    await this.healthStateRepository.save(state);

    if (event.state === 'RUNNING') {
      return;
    }

    const reason: AlertResolutionReason =
      event.state === 'ARCHIVED'
        ? 'HEALTH_CHECK_TARGET_ARCHIVED'
        : 'HEALTH_CHECK_TARGET_PAUSED';
    const message =
      event.state === 'ARCHIVED'
        ? 'Health check alert resolved because the target was archived'
        : 'Health check alert resolved because monitoring was paused';

    await this.resolveActiveHealthAlerts(
      event.healthCheckTargetId,
      new Date(event.occurredAt),
      reason,
      message,
    );
  }

  private async processHealthResult(
    event: HealthCheckResultRecordedEvent,
  ): Promise<Alert | null> {
    let state = await this.healthStateRepository.findByTargetId(
      event.healthCheckTargetId,
    );

    if (!state) {
      state = HealthCheckAlertState.create({
        healthCheckTargetId: event.healthCheckTargetId,
        assetId: event.assetId,
        url: event.url,
        checkIntervalSeconds: event.checkIntervalSeconds,
      });
    }

    const before = state.toObject();
    const occurredAt = new Date(event.occurredAt);

    if (
      !before.enabled ||
      before.archived ||
      (before.lastResultAt && occurredAt <= before.lastResultAt)
    ) {
      return null;
    }

    if (before.state === 'STALE') {
      const staleAlert = await this.alertRepository.findActiveByDedupKey(
        this.healthDedupKey(event.healthCheckTargetId, 'HEALTH_CHECK_STALE'),
      );

      if (staleAlert) {
        await this.resolveAlert(
          staleAlert,
          null,
          occurredAt,
          'HEALTH_CHECK_DATA_RESUMED',
          `Health check data resumed for ${event.url}`,
        );
      }
    }

    const transition = state.recordResult(
      {
        statusCode: event.statusCode,
        responseTimeMs: event.responseTimeMs,
        error: event.error,
        occurredAt,
      },
      HEALTH_FAILURE_THRESHOLD,
      HEALTH_RECOVERY_THRESHOLD,
    );
    const after = state.toObject();

    await this.healthStateRepository.save(state);

    if (
      after.state === 'ALERTED' &&
      transition.previousState !== 'ALERTED' &&
      transition.previousState !== 'RECOVERING'
    ) {
      const actualText = this.healthActualText(event);
      const alert = Alert.create(randomUUID(), {
        sourceType: 'HEALTH_CHECK',
        sourceId: event.healthCheckTargetId,
        alertType: 'ENDPOINT_UNAVAILABLE',
        dedupKey: this.healthDedupKey(
          event.healthCheckTargetId,
          'ENDPOINT_UNAVAILABLE',
        ),
        assetId: event.assetId,
        metricType: 'HTTP',
        severity: 'CRITICAL',
        actualText,
        context: this.healthContext(event),
        message: `Health check failed for ${event.url}: ${actualText}`,
        triggeredAt: occurredAt,
      });

      return this.createAlert(alert);
    }

    if (
      after.state === 'HEALTHY' &&
      (transition.previousState === 'ALERTED' ||
        transition.previousState === 'RECOVERING')
    ) {
      const activeAlert = await this.alertRepository.findActiveByDedupKey(
        this.healthDedupKey(event.healthCheckTargetId, 'ENDPOINT_UNAVAILABLE'),
      );

      if (activeAlert) {
        return this.resolveAlert(
          activeAlert,
          null,
          occurredAt,
          'HEALTH_CHECK_RECOVERED',
          `Health check recovered for ${event.url}`,
          `HTTP ${event.statusCode ?? 200}`,
          this.healthContext(event),
        );
      }
    }

    return null;
  }

  async createAlert(alert: Alert): Promise<Alert> {
    const createdAlert = await this.alertRepository.create(alert);
    const data = createdAlert.toObject();

    await this.alertRepository.appendLifecycleEvent({
      lifecycleEventId: randomUUID(),
      alertId: data.alertId,
      eventType: 'TRIGGERED',
      actorUserId: null,
      reason: data.message,
      context: data.context,
      occurredAt: data.triggeredAt,
    });

    await this.notificationEventPublisher.publish({
      eventType: 'ALERT_TRIGGERED',
      alertId: data.alertId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      alertType: data.alertType,
      ruleId: data.ruleId,
      assetId: data.assetId,
      metricType: data.metricType,
      severity: data.severity,
      message: data.message,
      occurredAt: data.triggeredAt.toISOString(),
    });

    return createdAlert;
  }

  async resolveAlert(
    alert: Alert,
    actualValue: number | null,
    resolvedAt: Date,
    reason: AlertResolutionReason,
    message: string,
    actualText?: string | null,
    context?: Record<string, unknown> | null,
  ): Promise<Alert> {
    alert.resolve(actualValue, resolvedAt, reason, {
      actualText,
      message,
      context,
    });

    const updatedAlert = await this.alertRepository.update(alert);
    const data = updatedAlert.toObject();

    await this.alertRepository.appendLifecycleEvent({
      lifecycleEventId: randomUUID(),
      alertId: data.alertId,
      eventType: 'RESOLVED',
      actorUserId: null,
      reason,
      context: data.context,
      occurredAt: resolvedAt,
    });

    await this.notificationEventPublisher.publish({
      eventType: 'ALERT_RESOLVED',
      alertId: data.alertId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      alertType: data.alertType,
      ruleId: data.ruleId,
      assetId: data.assetId,
      metricType: data.metricType,
      severity: data.severity,
      message,
      occurredAt: resolvedAt.toISOString(),
      resolutionReason: reason,
    });

    return updatedAlert;
  }

  private async resolveActiveHealthAlerts(
    targetId: string,
    resolvedAt: Date,
    reason: AlertResolutionReason,
    message: string,
  ): Promise<void> {
    const alerts = await this.alertRepository.findActiveBySource(
      'HEALTH_CHECK',
      targetId,
    );

    for (const alert of alerts) {
      await this.resolveAlert(alert, null, resolvedAt, reason, message);
    }
  }

  private healthDedupKey(
    targetId: string,
    alertType: 'ENDPOINT_UNAVAILABLE' | 'HEALTH_CHECK_STALE',
  ): string {
    return `HEALTH_CHECK:${targetId}:${alertType}`;
  }

  private healthActualText(event: HealthCheckResultRecordedEvent): string {
    if (event.error) {
      return event.error;
    }

    return event.statusCode === null
      ? 'No response'
      : `HTTP ${event.statusCode}`;
  }

  private healthContext(
    event: HealthCheckResultRecordedEvent,
  ): Record<string, unknown> {
    return {
      url: event.url,
      statusCode: event.statusCode,
      responseTimeMs: event.responseTimeMs,
      error: event.error,
    };
  }
}
