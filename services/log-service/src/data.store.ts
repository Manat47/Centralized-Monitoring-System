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
    requestId?: string,
  ) {
    const month =
      new Date(new Date(acceptedAt).getTime() + 7 * 3600_000)
        .toISOString()
        .slice(0, 7) + '-01';
    await this.transaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO log_accepted_batches
        (batch_id,project_id,accepted_at,accepted_count,request_id,processing_status)
        VALUES ($1,$2,$3,$4,$5,'QUEUED')
        ON CONFLICT DO NOTHING RETURNING batch_id`,
        [batchId, projectId, acceptedAt, count, requestId ?? null],
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
        SET status='ACCEPTED',accepted_count=$3,batch_id=$4 WHERE project_id=$1 AND idempotency_key=$2`,
          [projectId, idempotencyKey, count, batchId],
        );
    });
  }

  async markBatchStored(batchId: string): Promise<void> {
    await this.query(
      `UPDATE log_accepted_batches SET processing_status='STORED',processed_at=now(),failure_reason=NULL
       WHERE batch_id=$1 AND processing_status <> 'STORED'`,
      [batchId],
    );
  }

  async markBatchFailed(batchId: string, reason: string): Promise<void> {
    await this.query(
      `UPDATE log_accepted_batches SET processing_status='FAILED',processed_at=now(),failure_reason=$2
       WHERE batch_id=$1 AND processing_status <> 'STORED'`,
      [batchId, reason.slice(0, 500)],
    );
  }

  async batchStatus(projectId: string, batchId: string) {
    const rows = await this.query<{
      batch_id: string;
      request_id: string | null;
      accepted_at: Date;
      accepted_count: number;
      processing_status: string;
      processed_at: Date | null;
      failure_reason: string | null;
    }>(
      `SELECT batch_id,request_id,accepted_at,accepted_count,processing_status,processed_at,failure_reason
       FROM log_accepted_batches WHERE project_id=$1 AND batch_id=$2`,
      [projectId, batchId],
    );
    const row = rows.rows[0];
    return (
      row && {
        batchId: row.batch_id,
        requestId: row.request_id,
        acceptedAt: row.accepted_at,
        acceptedRecords: row.accepted_count,
        status: row.processing_status,
        processedAt: row.processed_at,
        failureReason: row.failure_reason,
      }
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
