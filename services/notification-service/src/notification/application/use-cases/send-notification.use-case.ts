import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { NotificationEvent } from '../contracts/notification-event.contract';
import {
  NotificationExecutionRouter,
  type NotificationExecutionReport,
} from '../services/notification-execution.router';

@Injectable()
export class SendNotificationUseCase {
  constructor(
    private readonly executionRouter: NotificationExecutionRouter,
    private readonly config: ConfigService,
  ) {}

  private explorerUrl(path: string): string | undefined {
    const configured = this.config.get<string>('DASHBOARD_PUBLIC_URL');
    if (!configured) return undefined;
    try {
      const base = new URL(configured);
      const url = new URL(path, base);
      if (
        !['http:', 'https:'].includes(base.protocol) ||
        base.username ||
        base.password ||
        url.origin !== base.origin ||
        url.pathname !== '/explorer'
      )
        return undefined;
      return url.toString();
    } catch {
      return undefined;
    }
  }

  async execute(
    event: NotificationEvent,
  ): Promise<NotificationExecutionReport> {
    if (event.eventType === 'log_finding_alert') {
      const actionUrl = this.explorerUrl(event.deepLink);
      return this.executionRouter.execute({
        alertId: event.eventId,
        assetId: null,
        sourceId: event.ruleId,
        severity:
          event.severity === 'critical' || event.severity === 'high'
            ? 'CRITICAL'
            : 'WARNING',
        status: 'TRIGGERED',
        alertType: 'LOG_FINDING',
        metricType: 'LOG_FINDING',
        title: event.isSummary ? `${event.title} (summary)` : event.title,
        message: `${event.countOverflow ? '> 10,000' : event.matchCount} matching logs in ${event.timeWindowSeconds}s from ${event.service}.\n${event.snippet}`,
        actionUrl,
        occurredAt: new Date(event.timestamp),
      });
    }
    let title: string;

    if (event.eventType === 'ALERT_TRIGGERED') {
      title = `${event.severity} alert triggered`;
    } else if (event.resolutionReason === 'ASSET_DEACTIVATED') {
      title = `${event.severity} alert ended — asset deactivated`;
    } else if (event.resolutionReason === 'METRIC_RULE_UPDATED') {
      title = `${event.severity} alert ended — metric rule updated`;
    } else if (event.resolutionReason === 'METRIC_RULE_DISABLED') {
      title = `${event.severity} alert ended — metric rule disabled`;
    } else if (event.resolutionReason === 'METRIC_RULE_ARCHIVED') {
      title = `${event.severity} alert ended — metric rule archived`;
    } else {
      title = `${event.severity} alert resolved`;
    }

    // TODO: Emit alert delivery/fallback audit events when the shared audit
    // contract accepts system actors and notification delivery actions.
    return this.executionRouter.execute({
      alertId: event.alertId,
      assetId: event.assetId,
      sourceId: event.sourceId,
      severity: event.severity,
      status: event.eventType === 'ALERT_TRIGGERED' ? 'TRIGGERED' : 'RESOLVED',
      alertType: event.alertType,
      metricType: event.metricType,
      resolutionReason:
        event.eventType === 'ALERT_RESOLVED'
          ? event.resolutionReason
          : undefined,
      title,
      message: event.message,
      occurredAt: new Date(event.occurredAt),
    });
  }
}
