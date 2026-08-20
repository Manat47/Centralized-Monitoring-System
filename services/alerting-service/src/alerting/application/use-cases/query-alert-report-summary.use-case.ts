import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import type {
  AlertProps,
  AlertStatus,
} from '../../domain/entities/alert.entity';

import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/repositories/alert.repository';

export interface QueryAlertReportSummaryInput {
  assetId?: string;
  from: Date;
  to: Date;
}

export interface AlertReportSummary {
  totalAlerts: number;

  severity: {
    warning: number;
    critical: number;
  };

  status: {
    triggered: number;
    acknowledged: number;
    resolved: number;
    closed: number;
  };

  activeAlerts: number;

  metricTypes: Record<string, number>;

  acknowledgementTime: {
    averageSeconds: number | null;
    p95Seconds: number | null;
  };

  resolutionTime: {
    averageSeconds: number | null;
    maxSeconds: number | null;
    p95Seconds: number | null;
  };
}

@Injectable()
export class QueryAlertReportSummaryUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,
  ) {}

  async execute(
    input: QueryAlertReportSummaryInput,
  ): Promise<AlertReportSummary> {
    if (input.from >= input.to) {
      throw new BadRequestException(
        'Report start time must be before end time',
      );
    }

    const alerts = await this.alertRepository.findForReport({
      assetId: input.assetId,
      from: input.from,
      to: input.to,
    });

    const severity = {
      warning: 0,
      critical: 0,
    };

    const status = {
      triggered: 0,
      acknowledged: 0,
      resolved: 0,
      closed: 0,
    };

    const metricTypes: Record<string, number> = {};

    const acknowledgementSeconds: number[] = [];
    const resolutionSeconds: number[] = [];

    for (const alert of alerts) {
      const data = alert.toObject();

      if (data.severity === 'WARNING') {
        severity.warning += 1;
      } else {
        severity.critical += 1;
      }

      const statusAtPeriodEnd = this.getStatusAt(data, input.to);

      switch (statusAtPeriodEnd) {
        case 'TRIGGERED':
          status.triggered += 1;
          break;

        case 'ACKNOWLEDGED':
          status.acknowledged += 1;
          break;

        case 'RESOLVED':
          status.resolved += 1;
          break;

        case 'CLOSED':
          status.closed += 1;
          break;
      }

      metricTypes[data.metricType] = (metricTypes[data.metricType] ?? 0) + 1;

      if (data.acknowledgedAt && data.acknowledgedAt <= input.to) {
        acknowledgementSeconds.push(
          this.durationSeconds(data.triggeredAt, data.acknowledgedAt),
        );
      }

      if (data.resolvedAt && data.resolvedAt <= input.to) {
        resolutionSeconds.push(
          this.durationSeconds(data.triggeredAt, data.resolvedAt),
        );
      }
    }

    return {
      totalAlerts: alerts.length,

      severity,

      status,

      activeAlerts: status.triggered + status.acknowledged,

      metricTypes,

      acknowledgementTime: {
        averageSeconds: this.averageOrNull(acknowledgementSeconds),

        p95Seconds: this.percentile95(acknowledgementSeconds),
      },

      resolutionTime: {
        averageSeconds: this.averageOrNull(resolutionSeconds),

        maxSeconds: this.maxOrNull(resolutionSeconds),

        p95Seconds: this.percentile95(resolutionSeconds),
      },
    };
  }

  private getStatusAt(alert: AlertProps, periodEnd: Date): AlertStatus {
    if (alert.closedAt && alert.closedAt <= periodEnd) {
      return 'CLOSED';
    }

    if (alert.resolvedAt && alert.resolvedAt <= periodEnd) {
      return 'RESOLVED';
    }

    if (alert.acknowledgedAt && alert.acknowledgedAt <= periodEnd) {
      return 'ACKNOWLEDGED';
    }

    return 'TRIGGERED';
  }

  private durationSeconds(start: Date, end: Date): number {
    return this.round((end.getTime() - start.getTime()) / 1000);
  }

  private averageOrNull(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    const total = values.reduce((sum, value) => sum + value, 0);

    return this.round(total / values.length);
  }

  private maxOrNull(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    return this.round(Math.max(...values));
  }

  private percentile95(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);

    const index = Math.ceil(sorted.length * 0.95) - 1;

    return this.round(sorted[index] ?? sorted[sorted.length - 1]);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
