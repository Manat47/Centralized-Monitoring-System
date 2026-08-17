import { Injectable } from '@nestjs/common';

import type {
  MetricsCollector,
  VerifyMetricsEndpointResult,
  CollectMetricsResult,
} from '../../domain/ports/metrics-collector.port';

@Injectable()
export class ApplicationMetricsCollector implements MetricsCollector {
  async verify(url: string): Promise<VerifyMetricsEndpointResult> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          success: false,
          errorMessage: `Application metrics endpoint returned HTTP ${response.status}`,
        };
      }

      const body = await response.text();

      const looksLikePrometheusMetrics =
        body.includes('# HELP') || body.includes('# TYPE');

      if (!looksLikePrometheusMetrics) {
        return {
          success: false,
          errorMessage:
            'Endpoint responded, but it does not appear to expose Prometheus metrics',
        };
      }

      return {
        success: true,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Unable to connect to application metrics endpoint',
      };
    }
  }

  async collect(url: string): Promise<CollectMetricsResult> {
    const collectedAt = new Date();

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          success: false,
          rawMetrics: null,
          collectedAt,
          errorMessage: `Application metrics endpoint returned HTTP ${response.status}`,
        };
      }

      const rawMetrics = await response.text();

      return {
        success: true,
        rawMetrics,
        collectedAt,
        errorMessage: null,
      };
    } catch (error) {
      return {
        success: false,
        rawMetrics: null,
        collectedAt,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Unable to collect application metrics',
      };
    }
  }
}
