import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';

@Injectable()
export class DataStore implements OnModuleDestroy {
  readonly pool: Pool;

  constructor() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: unknown[] = [],
  ) {
    return this.pool.query<T>(sql, values);
  }

  async transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await run(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async recordAccepted(
    batchId: string,
    projectId: string,
    acceptedAt: string,
    count: number,
    idempotencyKey?: string,
  ) {
    const month =
      new Date(new Date(acceptedAt).getTime() + 7 * 3600_000)
        .toISOString()
        .slice(0, 7) + '-01';
    await this.transaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO log_accepted_batches
        (batch_id,project_id,accepted_at,accepted_count) VALUES ($1,$2,$3,$4)
        ON CONFLICT DO NOTHING RETURNING batch_id`,
        [batchId, projectId, acceptedAt, count],
      );
      if (inserted.rowCount) {
        await client.query(
          `INSERT INTO log_monthly_usage (project_id,month_start,accepted_records)
          VALUES ($1,$2,$3) ON CONFLICT (project_id,month_start) DO UPDATE
          SET accepted_records=log_monthly_usage.accepted_records+EXCLUDED.accepted_records`,
          [projectId, month, count],
        );
      }
      if (idempotencyKey)
        await client.query(
          `UPDATE log_idempotency
        SET status='ACCEPTED',accepted_count=$3 WHERE project_id=$1 AND idempotency_key=$2`,
          [projectId, idempotencyKey, count],
        );
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
