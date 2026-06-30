import { Injectable } from '@nestjs/common';

import type {
  MetricsParser,
  ParsedMetric,
} from '../../domain/ports/metrics-parser.port';

@Injectable()
export class PrometheusTextParser implements MetricsParser {
  parse(rawMetrics: string, collectedAt: Date): ParsedMetric[] {
    const metrics: ParsedMetric[] = [];

    const lines = rawMetrics.split(/\r?\n/);

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
        continue;
      }

      const parsedMetric = this.parseLine(trimmedLine, collectedAt);

      if (parsedMetric) {
        metrics.push(parsedMetric);
      }
    }

    return metrics;
  }

  private parseLine(line: string, collectedAt: Date): ParsedMetric | null {
    const match = line.match(
      /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([^\s]+)(?:\s+\d+)?$/,
    );

    if (!match) {
      return null;
    }

    const [, name, rawLabels, rawValue] = match;

    if (!name || !rawValue) {
      return null;
    }

    const value = Number(rawValue);

    if (!Number.isFinite(value)) {
      return null;
    }

    return {
      name,
      labels: this.parseLabels(rawLabels),
      value,
      collectedAt,
    };
  }

  private parseLabels(rawLabels?: string): Record<string, string> {
    if (!rawLabels) {
      return {};
    }

    const labels: Record<string, string> = {};

    const labelPattern = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:\\.|[^"])*)"/g;

    for (const match of rawLabels.matchAll(labelPattern)) {
      const [, key, rawValue] = match;

      if (!key || rawValue === undefined) {
        continue;
      }

      labels[key] = rawValue
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n');
    }

    return labels;
  }
}
