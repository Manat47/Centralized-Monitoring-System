import { Injectable } from '@nestjs/common';

import type { NotificationEvent } from '../contracts/notification-event.contract';
import {
  NotificationExecutionRouter,
  type NotificationExecutionReport,
} from '../services/notification-execution.router';

@Injectable()
export class SendNotificationUseCase {
  constructor(private readonly executionRouter: NotificationExecutionRouter) {}

  async execute(
    event: NotificationEvent,
  ): Promise<NotificationExecutionReport> {
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
