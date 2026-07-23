import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema/users.schema';

export const DRIZZLE_DB = Symbol('DRIZZLE_DB');

export const databaseProvider = {
  provide: DRIZZLE_DB,

  inject: [ConfigService],

  useFactory: (configService: ConfigService) => {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    const pool = new Pool({
      connectionString: databaseUrl,
    });

    return drizzle(pool, { schema });
  },
};
