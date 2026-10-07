import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DataStore } from '../../../data.store';
import type {
  ActivityRule,
  RuleMatch,
} from '../../domain/entities/activity-rule.entity';
import type { StoredLog } from '../../domain/entities/log-event.entity';
import type {
  ActivityActor,
  ActivityRepository,
  RequestReceipt,
  RuleDraft,
} from '../../domain/repositories/activity.repository';

type Row = Record<string, unknown>;

function rule(row: Row): ActivityRule {
  return {
    ruleId: String(row.rule_id),
    projectId: String(row.project_id),
    name: String(row.name),
    eventType: String(row.event_type),
    conditionField: String(row.condition_field),
    conditionValue: String(row.condition_value),
    sourceFilter:
      typeof row.source_filter === 'string' ? row.source_filter : null,
    groupBy: row.group_by as ActivityRule['groupBy'],
    threshold: Number(row.threshold),
    windowMinutes: Number(row.window_minutes),
    enabled: Boolean(row.enabled),
    activatedAt: new Date(String(row.activated_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    dataSource: row.data_source as ActivityRule['dataSource'],
    ...(row.sample_count !== undefined
      ? {
          sampleCount: Number(row.sample_count),
          waitingForData: Number(row.sample_count) === 0,
        }
      : {}),
  };
}

@Injectable()
export class PostgresActivityRepository
  implements ActivityRepository, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PostgresActivityRepository.name);
  private cleanupTimer?: ReturnType<typeof setInterval>;
  constructor(private readonly db: DataStore) {}

  onModuleInit() {
    this.cleanupTimer = setInterval(() => {
      void this.cleanup().catch((error: unknown) =>
        this.logger.warn(`Log retention cleanup will retry: ${String(error)}`),
      );
    }, 3600_000);
  }
  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async activeRules(projectId: string): Promise<ActivityRule[]> {
    const rows = await this.db.query<Row>(
      "SELECT * FROM log_detection_rules WHERE project_id=$1 AND data_source='ACCEPTED_RECORDS' AND enabled=true AND archived_at IS NULL",
      [projectId],
    );
    return rows.rows.map(rule);
  }

  async listRules(projectId: string): Promise<ActivityRule[]> {
    const rows = await this.db.query<Row>(
      `SELECT r.*,
      CASE WHEN r.data_source='LOG_API_REQUESTS' THEN
        (SELECT count(*) FROM log_ingest_requests q WHERE q.project_id=r.project_id
         AND q.received_at >= now() - interval '24 hours'
         AND (r.condition_value='any' OR
           (r.condition_field='http_status' AND q.http_status::text=r.condition_value) OR
           (r.condition_field='result' AND CASE WHEN q.http_status=202 THEN 'accepted' ELSE 'rejected' END=r.condition_value))
         AND (r.group_by='project' OR (r.group_by='token_id' AND q.token_id IS NOT NULL)))
      ELSE (SELECT count(*) FROM log_event_records e WHERE e.project_id=r.project_id
       AND e.received_at >= now() - interval '24 hours' AND e.event_type=r.event_type
        AND (r.source_filter IS NULL OR e.source=r.source_filter)
       AND CASE r.condition_field
         WHEN 'source' THEN e.source WHEN 'event_type' THEN e.event_type
         WHEN 'severity' THEN e.severity WHEN 'client.ip' THEN e.client_ip
         WHEN 'user_id' THEN e.user_id WHEN 'status_code' THEN e.status_code::text
         ELSE NULL END = r.condition_value
       AND (r.group_by='project' OR (r.group_by='client.ip' AND e.client_ip IS NOT NULL)
            OR (r.group_by='user_id' AND e.user_id IS NOT NULL)
            OR (r.group_by='token_id' AND e.token_id IS NOT NULL))) END AS sample_count
      FROM log_detection_rules r WHERE r.project_id=$1 AND r.archived_at IS NULL ORDER BY r.created_at DESC`,
      [projectId],
    );
    return rows.rows.map(rule);
  }

  async preview(projectId: string, draft: RuleDraft) {
    if (draft.dataSource === 'LOG_API_REQUESTS') {
      const rows = await this.db.query<{ matching: string; usable: string }>(
        `SELECT count(*)::text AS matching,
        count(*) FILTER (WHERE $3::text='project' OR q.token_id IS NOT NULL)::text AS usable
        FROM log_ingest_requests q WHERE q.project_id=$1 AND q.received_at >= now() - interval '24 hours'
        AND ($2::text='any' OR ($4::text='http_status' AND q.http_status::text=$2)
          OR ($4::text='result' AND CASE WHEN q.http_status=202 THEN 'accepted' ELSE 'rejected' END=$2))`,
        [projectId, draft.conditionValue, draft.groupBy, draft.conditionField],
      );
      return {
        matchingRecords: Number(rows.rows[0]?.matching ?? 0),
        usableGroupRecords: Number(rows.rows[0]?.usable ?? 0),
      };
    }
    const column: Record<string, string> = {
      source: 'e.source',
      event_type: 'e.event_type',
      severity: 'e.severity',
      'client.ip': 'e.client_ip',
      user_id: 'e.user_id',
      status_code: 'e.status_code::text',
      token_id: 'e.token_id::text',
    };
    const group =
      draft.groupBy === 'project'
        ? 'TRUE'
        : draft.groupBy === 'client.ip'
          ? 'e.client_ip IS NOT NULL'
          : draft.groupBy === 'token_id'
            ? 'e.token_id IS NOT NULL'
            : 'e.user_id IS NOT NULL';
    const rows = await this.db.query<{ matching: string; usable: string }>(
      `SELECT count(*)::text AS matching,
      count(*) FILTER (WHERE ${group})::text AS usable FROM log_event_records e
      WHERE e.project_id=$1 AND e.received_at >= now() - interval '24 hours'
        AND e.event_type=$2 AND ${column[draft.conditionField]}=$3
        AND ($4::text IS NULL OR e.source=$4)`,
      [
        projectId,
        draft.eventType,
        draft.conditionValue,
        draft.sourceFilter ?? null,
      ],
    );
    return {
      matchingRecords: Number(rows.rows[0]?.matching ?? 0),
      usableGroupRecords: Number(rows.rows[0]?.usable ?? 0),
    };
  }

  private async audit(
    client: PoolClient,
    projectId: string,
    actor: ActivityActor,
    action: string,
    ruleId: string,
    detail: Record<string, unknown>,
  ) {
    await client.query(
      `INSERT INTO log_project_activity (activity_id,project_id,actor_user_id,action,resource_id,detail) VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        randomUUID(),
        projectId,
        actor.userId,
        action,
        ruleId,
        JSON.stringify(detail),
      ],
    );
    await client.query(
      'INSERT INTO log_audit_outbox (event_id,payload) VALUES ($1,$2)',
      [
        randomUUID(),
        JSON.stringify({
          actorUserId: actor.userId,
          actorRole: actor.role,
          actorEmail: actor.email,
          action,
          resourceType: 'DETECTION_RULE',
          resourceId: ruleId,
          metadata: { projectId, ...detail },
        }),
      ],
    );
  }

  async createRule(
    projectId: string,
    actor: ActivityActor,
    draft: RuleDraft,
  ): Promise<ActivityRule> {
    return this.db.transaction(async (client) => {
      const rows = await client.query<Row>(
        `INSERT INTO log_detection_rules
        (rule_id,project_id,name,event_type,condition_field,condition_value,group_by,threshold,window_minutes,data_source,source_filter)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          randomUUID(),
          projectId,
          draft.name,
          draft.eventType,
          draft.conditionField,
          draft.conditionValue,
          draft.groupBy,
          draft.threshold,
          draft.windowMinutes,
          draft.dataSource,
          draft.sourceFilter ?? null,
        ],
      );
      const created = rule(rows.rows[0]);
      await this.audit(
        client,
        projectId,
        actor,
        'DETECTION_RULE_CREATED',
        created.ruleId,
        { name: created.name },
      );
      return created;
    });
  }

  async setRuleEnabled(
    projectId: string,
    actor: ActivityActor,
    ruleId: string,
    enabled: boolean,
  ): Promise<ActivityRule | null> {
    return this.db.transaction(async (client) => {
      const rows = await client.query<Row>(
        `UPDATE log_detection_rules SET enabled=$3,updated_at=now(),
        activated_at=CASE WHEN $3 THEN now() ELSE activated_at END
        WHERE project_id=$1 AND rule_id=$2 AND archived_at IS NULL RETURNING *`,
        [projectId, ruleId, enabled],
      );
      if (!rows.rows[0]) return null;
      const updated = rule(rows.rows[0]);
      await this.audit(
        client,
        projectId,
        actor,
        enabled ? 'DETECTION_RULE_ENABLED' : 'DETECTION_RULE_DISABLED',
        ruleId,
        { name: updated.name },
      );
      return updated;
    });
  }

  async process(
    projectId: string,
    event: StoredLog,
    matches: RuleMatch[],
  ): Promise<void> {
    await this.db.transaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO log_event_records
        (server_event_id,request_id,project_id,token_id,received_at,event_time,time_source,source,event_type,severity,
         duration_ms,status_code,message,user_id,client_ip,location,tags,raw_payload)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT (server_event_id) DO NOTHING RETURNING server_event_id`,
        [
          event.eventId,
          event.requestId,
          projectId,
          event.tokenId || null,
          event.receivedAt,
          event.timestamp,
          event.timeSource,
          event.source,
          event.event_type,
          event.severity ?? null,
          event.duration_ms ?? null,
          event.status_code ?? null,
          event.message ?? null,
          event.user_id ?? null,
          event.client?.ip ?? null,
          event.client?.location ?? null,
          event.tags ?? [],
          JSON.stringify(event.rawPayload),
        ],
      );
      if (!inserted.rowCount) return;
      for (const match of matches)
        await this.recordMatch(client, projectId, event, match);
    });
  }

  private async recordMatch(
    client: PoolClient,
    projectId: string,
    event: StoredLog,
    match: RuleMatch,
  ) {
    const { rule: matchedRule, groupValue } = match;
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',
      [matchedRule.ruleId, groupValue],
    );
    await client.query(
      `INSERT INTO log_detection_rule_events(rule_id,event_id,group_value,received_at)
      VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [matchedRule.ruleId, event.eventId, groupValue, event.receivedAt],
    );
    const cutoff = new Date(
      Math.max(
        Date.parse(event.receivedAt) - matchedRule.windowMinutes * 60_000,
        Date.parse(matchedRule.activatedAt) - 1,
      ),
    );
    const count = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM log_detection_rule_events
      WHERE rule_id=$1 AND group_value=$2 AND received_at > $3 AND received_at <= $4`,
      [matchedRule.ruleId, groupValue, cutoff, event.receivedAt],
    );
    const matchedCount = Number(count.rows[0]?.count ?? 0);
    if (matchedCount < matchedRule.threshold) return;
    const last = await client.query<{ triggered_at: Date }>(
      `SELECT triggered_at FROM log_detection_findings
      WHERE rule_id=$1 AND group_value=$2 ORDER BY triggered_at DESC LIMIT 1`,
      [matchedRule.ruleId, groupValue],
    );
    if (
      last.rows[0] &&
      Date.parse(event.receivedAt) - last.rows[0].triggered_at.getTime() <
        matchedRule.windowMinutes * 60_000
    )
      return;
    await client.query(
      `INSERT INTO log_detection_findings
      (finding_id,project_id,rule_id,group_value,matched_count,triggered_at,window_start,event_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [
        randomUUID(),
        projectId,
        matchedRule.ruleId,
        groupValue,
        matchedCount,
        event.receivedAt,
        cutoff,
        event.eventId,
      ],
    );
  }

  async processRequest(receipt: RequestReceipt): Promise<void> {
    await this.db.transaction(async (client) => {
      const inserted = await client.query(
        `INSERT INTO log_ingest_requests
        (request_id,project_id,token_id,received_at,http_status,rejection_reason,accepted_records)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING request_id`,
        [
          receipt.requestId,
          receipt.projectId,
          receipt.tokenId,
          receipt.receivedAt,
          receipt.httpStatus,
          receipt.reason,
          receipt.acceptedRecords,
        ],
      );
      if (!inserted.rowCount || !receipt.projectId) return;
      const rules = await client.query<Row>(
        `SELECT * FROM log_detection_rules WHERE project_id=$1
        AND data_source='LOG_API_REQUESTS' AND enabled=true AND archived_at IS NULL
        AND activated_at <= $2`,
        [receipt.projectId, receipt.receivedAt],
      );
      for (const row of rules.rows) {
        const current = rule(row);
        const actual =
          current.conditionField === 'http_status'
            ? String(receipt.httpStatus)
            : receipt.httpStatus === 202
              ? 'accepted'
              : 'rejected';
        if (
          current.conditionValue !== 'any' &&
          actual !== current.conditionValue
        )
          continue;
        const groupValue =
          current.groupBy === 'token_id' ? receipt.tokenId : 'project';
        if (!groupValue) continue;
        await client.query(
          'SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',
          [current.ruleId, groupValue],
        );
        await client.query(
          `INSERT INTO log_detection_request_events(rule_id,request_id,group_value,received_at)
          VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [current.ruleId, receipt.requestId, groupValue, receipt.receivedAt],
        );
        const cutoff = new Date(
          Math.max(
            Date.parse(receipt.receivedAt) - current.windowMinutes * 60_000,
            Date.parse(current.activatedAt) - 1,
          ),
        );
        const count = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM log_detection_request_events
          WHERE rule_id=$1 AND group_value=$2 AND received_at>$3 AND received_at<=$4`,
          [current.ruleId, groupValue, cutoff, receipt.receivedAt],
        );
        const matchedCount = Number(count.rows[0]?.count ?? 0);
        if (matchedCount < current.threshold) continue;
        const last = await client.query<{ triggered_at: Date }>(
          `SELECT triggered_at FROM log_detection_findings
          WHERE rule_id=$1 AND group_value=$2 ORDER BY triggered_at DESC LIMIT 1`,
          [current.ruleId, groupValue],
        );
        if (
          last.rows[0] &&
          Date.parse(receipt.receivedAt) - last.rows[0].triggered_at.getTime() <
            current.windowMinutes * 60_000
        )
          continue;
        await client.query(
          `INSERT INTO log_detection_findings
          (finding_id,project_id,rule_id,group_value,matched_count,triggered_at,window_start,request_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
          [
            randomUUID(),
            receipt.projectId,
            current.ruleId,
            groupValue,
            matchedCount,
            receipt.receivedAt,
            cutoff,
            receipt.requestId,
          ],
        );
      }
    });
  }

  async findings(projectId: string, limit: number, offset: number) {
    const rows = await this.db.query<Row>(
      `SELECT f.finding_id AS "findingId",f.rule_id AS "ruleId",r.name AS "ruleName",
      r.event_type AS "eventType",r.condition_field AS "conditionField",r.condition_value AS "conditionValue",r.source_filter AS "sourceFilter",
      r.group_by AS "groupBy",r.data_source AS "dataSource",f.group_value AS "groupValue",
      f.matched_count AS "matchedCount",f.triggered_at AS "triggeredAt",f.window_start AS "windowStart",
      f.event_id AS "eventId",f.request_id AS "requestId" FROM log_detection_findings f JOIN log_detection_rules r ON r.rule_id=f.rule_id
      WHERE f.project_id=$1 ORDER BY f.triggered_at DESC LIMIT $2 OFFSET $3`,
      [projectId, limit + 1, offset],
    );
    return {
      items: rows.rows.slice(0, limit),
      nextOffset: rows.rows.length > limit ? offset + limit : null,
    };
  }

  async cleanup(): Promise<void> {
    await this.db.query(
      "DELETE FROM log_detection_findings WHERE triggered_at < now() - interval '30 days'",
    );
    await this.db.query(
      "DELETE FROM log_detection_rule_events WHERE received_at < now() - interval '30 days'",
    );
    await this.db.query(
      "DELETE FROM log_detection_request_events WHERE received_at < now() - interval '30 days'",
    );
    await this.db.query(
      "DELETE FROM log_event_records WHERE received_at < now() - interval '30 days'",
    );
    await this.db.query(
      "DELETE FROM log_ingest_requests WHERE received_at < now() - interval '30 days'",
    );
    await this.db.query(
      "DELETE FROM log_accepted_batches WHERE accepted_at < now() - interval '30 days'",
    );
  }
}
