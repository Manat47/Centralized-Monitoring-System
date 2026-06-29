import { Injectable } from '@nestjs/common';

import type {
  MetricsCollector,
  VerifyMetricsEndpointResult,
} from '../../domain/ports/metrics-collector.port';

@Injectable()
export class NodeExporterCollector implements MetricsCollector {
  async verify(url: string): Promise<VerifyMetricsEndpointResult> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          success: false,
          errorMessage: `Node Exporter returned HTTP ${response.status}`,
        };
      }

      const body = await response.text();

      const looksLikeNodeExporter =
        body.includes('# HELP') && body.includes('node_');

      if (!looksLikeNodeExporter) {
        return {
          success: false,
          errorMessage:
            'Endpoint responded, but it does not appear to be Node Exporter metrics',
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
            : 'Unable to connect to Node Exporter',
      };
    }
  }
}
