import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { Alert } from '../../domain/entities/alert.entity';
import {
  ALERT_REPOSITORY,
  type AlertRepository,
} from '../../domain/repositories/alert.repository';
import {
  HEALTH_CHECK_ALERT_STATE_REPOSITORY,
  type HealthCheckAlertStateRepository,
} from '../../domain/repositories/health-check-alert-state.repository';
import { ProcessAlertEventUseCase } from './process-alert-event.use-case';

@Injectable()
export class EvaluateStaleHealthChecksUseCase {
  constructor(
    @Inject(HEALTH_CHECK_ALERT_STATE_REPOSITORY)
    private readonly stateRepository: HealthCheckAlertStateRepository,
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepository,
    private readonly processAlertEventUseCase: ProcessAlertEventUseCase,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const candidates = await this.stateRepository.findStaleCandidates(now);
    let triggered = 0;

    for (const state of candidates) {
      if (!state.markStale(now)) {
        continue;
      }

      const data = state.toObject();
      await this.stateRepository.save(state);

      const activeAlerts = await this.alertRepository.findActiveBySource(
        'HEALTH_CHECK',
        data.healthCheckTargetId,
      );

      for (const activeAlert of activeAlerts) {
        await this.processAlertEventUseCase.resolveAlert(
          activeAlert,
          null,
          now,
          'HEALTH_CHECK_DATA_STALE',
          `Health check results became stale for ${data.url}`,
        );
      }

      const staleAlert = Alert.create(randomUUID(), {
        sourceType: 'HEALTH_CHECK',
        sourceId: data.healthCheckTargetId,
        alertType: 'HEALTH_CHECK_STALE',
        dedupKey: `HEALTH_CHECK:${data.healthCheckTargetId}:HEALTH_CHECK_STALE`,
        assetId: data.assetId,
        metricType: 'HTTP',
        severity: 'WARNING',
        actualText: 'No recent result',
        context: {
          url: data.url,
          lastResultAt: data.lastResultAt?.toISOString() ?? null,
          checkIntervalSeconds: data.checkIntervalSeconds,
        },
        message: `No recent health check result for ${data.url}`,
        triggeredAt: now,
      });

      await this.processAlertEventUseCase.createAlert(staleAlert);
      triggered += 1;
    }

    return triggered;
  }
}
