import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as schema from './schema/users.schema';
export declare const DRIZZLE_DB: unique symbol;
export declare const databaseProvider: {
    provide: symbol;
    inject: (typeof ConfigService)[];
    useFactory: (configService: ConfigService) => import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
        $client: Pool;
    };
};
