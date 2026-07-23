import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_DB } from '../src/database/database.provider';
import * as schema from '../src/database/schema/users.schema';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  @Get()
  checkLiveness() {
    return {
      service: 'auth-service',
      status: 'UP',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async checkReadiness() {
    try {
      await this.db.execute(sql`SELECT 1`);

      return {
        service: 'auth-service',
        status: 'READY',
        database: 'UP',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        service: 'auth-service',
        status: 'NOT_READY',
        database: 'DOWN',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
