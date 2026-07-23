import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../src/database/schema/users.schema';
export declare class HealthController {
    private readonly db;
    constructor(db: NodePgDatabase<typeof schema>);
    checkLiveness(): {
        service: string;
        status: string;
        timestamp: string;
    };
    checkReadiness(): Promise<{
        service: string;
        status: string;
        database: string;
        timestamp: string;
    }>;
}
