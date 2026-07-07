import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../database/database.provider';
import * as schema from '../database/schema/monitoring-targets.schema';

export interface ReadinessResult {
  status: 'ready' | 'not_ready';
  checks: {
    postgres: 'up' | 'down';
    influxdb: 'up' | 'down';
  };
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,

    private readonly configService: ConfigService,
  ) {}

  getLiveness() {
    return {
      status: 'ok',
      service: 'monitoring-service',
      timestamp: new Date(),
    };
  }

  async getReadiness(): Promise<ReadinessResult> {
    const [postgresStatus, influxdbStatus] = await Promise.all([
      this.checkPostgres(),
      this.checkInfluxDB(),
    ]);

    const isReady = postgresStatus === 'up' && influxdbStatus === 'up';

    return {
      status: isReady ? 'ready' : 'not_ready',
      checks: {
        postgres: postgresStatus,
        influxdb: influxdbStatus,
      },
    };
  }

  private async checkPostgres(): Promise<'up' | 'down'> {
    try {
      await this.db.execute(sql`select 1`);
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkInfluxDB(): Promise<'up' | 'down'> {
    const influxUrl = this.configService.get<string>('INFLUXDB_URL');

    if (!influxUrl) {
      return 'down';
    }

    try {
      const response = await fetch(`${influxUrl.replace(/\/$/, '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });

      return response.ok ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
