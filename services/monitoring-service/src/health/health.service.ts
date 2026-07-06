import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../database/database.provider';
import * as schema from '../database/schema/monitoring-targets.schema';

export interface ReadinessResult {
  status: 'ready' | 'not_ready';
  checks: {
    postgres: 'up' | 'down';
  };
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  getLiveness() {
    return {
      status: 'ok',
      service: 'monitoring-service',
      timestamp: new Date(),
    };
  }

  async getReadiness(): Promise<ReadinessResult> {
    try {
      await this.db.execute(sql`select 1`);

      return {
        status: 'ready',
        checks: {
          postgres: 'up',
        },
      };
    } catch {
      return {
        status: 'not_ready',
        checks: {
          postgres: 'down',
        },
      };
    }
  }
}
