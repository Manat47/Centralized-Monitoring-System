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
  ActivityFilters,
  ActivityRepository,
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
    groupBy: row.group_by as ActivityRule['groupBy'],
    threshold: Number(row.threshold),
    windowMinutes: Number(row.window_minutes),
    enabled: Boolean(row.enabled),
    activatedAt: new Date(String(row.activated_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function conditions(
  filters: Omit<ActivityFilters, 'limit' | 'offset'>,
  values: unknown[],
) {
  const clauses = ['project_id=$1', 'occurred_at >= $2', 'occurred_at < $3'];
  values.push(filters.from, filters.to);
  const add = (column: string, value: string | undefined, op = '=') => {
    if (value) {
      values.push(value);
      clauses.push(`${column} ${op} $${values.length}`);
    }
  };
  add('user_id', filters.userId);
  add('client_ip', filters.ip);
  add('event_type', filters.eventType);
  add('outcome', filters.condition);
  if (filters.search) add('message', `%${filters.search}%`, 'ILIKE');
  if (filters.tag) {
    values.push(filters.tag);
    clauses.push(`tags @> ARRAY[$${values.length}]::text[]`);
  }
  return clauses.join(' AND ');
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
        this.logger.warn(
          `Activity retention cleanup will retry: ${String(error)}`,
        ),
      );
    }, 3600_000);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async activeRules(projectId: string): Promise<ActivityRule[]> {
    const rows = await this.db.query<Row>(
      'SELECT * FROM activity_rules WHERE project_id=$1 AND enabled=true AND archived_at IS NULL',
      [projectId],
    );
    return rows.rows.map(rule);
  }

  async listRules(projectId: string): Promise<ActivityRule[]> {
    const rows = await this.db.query<Row>(
      'SELECT * FROM activity_rules WHERE project_id=$1 AND archived_at IS NULL ORDER BY created_at DESC',
      [projectId],
    );
    return rows.rows.map(rule);
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
      `INSERT INTO log_project_activity (activity_id,project_id,actor_user_id,action,resource_id,detail)
       VALUES ($1,$2,$3,$4,$5,$6)`,
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
          resourceType: 'ACTIVITY_RULE',
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
        `INSERT INTO activity_rules
       (rule_id,project_id,name,event_type,condition_field,condition_value,group_by,threshold,window_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
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
        ],
      );
      const created = rule(rows.rows[0]);
      await this.audit(
        client,
        projectId,
        actor,
        'ACTIVITY_RULE_CREATED',
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
        `UPDATE activity_rules SET enabled=$3,updated_at=now(),
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
        enabled ? 'ACTIVITY_RULE_ENABLED' : 'ACTIVITY_RULE_DISABLED',
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
      const sessionId =
        typeof event.metadata?.session_id === 'string'
          ? event.metadata.session_id
          : null;
      const outcome =
        typeof event.metadata?.status === 'string'
          ? event.metadata.status
          : null;
      const inserted = await client.query(
        `INSERT INTO activity_event_index
         (event_id,project_id,occurred_at,received_at,event_type,source,message,severity,
          user_id,client_ip,device_type,session_id,outcome,tags,payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
        [
          event.eventId,
          projectId,
          event.timestamp,
          event.receivedAt,
          event.event_type,
          event.source,
          event.message,
          event.severity ?? null,
          event.user_id ?? null,
          event.client?.ip ?? null,
          event.client?.device_type ?? null,
          sessionId,
          outcome,
          event.tags ?? [],
          JSON.stringify(event),
        ],
      );
      if (!inserted.rowCount) return;
      if (
        sessionId &&
        outcome === 'success' &&
        event.event_type === 'auth.login'
      )
        await this.recordLogin(client, projectId, sessionId, event);
      if (sessionId && event.event_type === 'auth.logout')
        await this.recordLogout(client, projectId, sessionId, event);
      for (const match of matches)
        await this.recordMatch(client, projectId, event, match);
    });
  }

  private async recordLogin(
    client: PoolClient,
    projectId: string,
    sessionId: string,
    event: StoredLog,
  ) {
    await client.query(
      `INSERT INTO activity_sessions
       (project_id,session_id,user_id,login_at,client_ip,device_type)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
      [
        projectId,
        sessionId,
        event.user_id ?? null,
        event.timestamp,
        event.client?.ip ?? null,
        event.client?.device_type ?? null,
      ],
    );
    const logout = await client.query<{ occurred_at: Date }>(
      `SELECT occurred_at FROM activity_event_index
       WHERE project_id=$1 AND session_id=$2 AND event_type='auth.logout' AND occurred_at >= $3
       ORDER BY occurred_at LIMIT 1`,
      [projectId, sessionId, event.timestamp],
    );
    if (logout.rows[0])
      await this.finishSession(
        client,
        projectId,
        sessionId,
        logout.rows[0].occurred_at,
      );
  }

  private async recordLogout(
    client: PoolClient,
    projectId: string,
    sessionId: string,
    event: StoredLog,
  ) {
    await this.finishSession(
      client,
      projectId,
      sessionId,
      new Date(event.timestamp),
    );
  }

  private async finishSession(
    client: PoolClient,
    projectId: string,
    sessionId: string,
    logoutAt: Date,
  ) {
    await client.query(
      `UPDATE activity_sessions SET logout_at=$3,
       duration_ms=floor(extract(epoch FROM ($3::timestamptz-login_at))*1000)::bigint
       WHERE project_id=$1 AND session_id=$2 AND logout_at IS NULL AND login_at <= $3`,
      [projectId, sessionId, logoutAt],
    );
  }

  private async recordMatch(
    client: PoolClient,
    projectId: string,
    event: StoredLog,
    match: RuleMatch,
  ) {
    const { rule, groupValue } = match;
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',
      [rule.ruleId, groupValue],
    );
    await client.query(
      `INSERT INTO activity_rule_events(rule_id,event_id,group_value,received_at)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [rule.ruleId, event.eventId, groupValue, event.receivedAt],
    );
    const cutoff = new Date(
      Math.max(
        Date.parse(event.receivedAt) - rule.windowMinutes * 60_000,
        Date.parse(rule.activatedAt) - 1,
      ),
    );
    const count = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM activity_rule_events
       WHERE rule_id=$1 AND group_value=$2 AND received_at > $3 AND received_at <= $4`,
      [rule.ruleId, groupValue, cutoff, event.receivedAt],
    );
    const matchedCount = Number(count.rows[0]?.count ?? 0);
    if (matchedCount < rule.threshold) return;
    const last = await client.query<{ triggered_at: Date }>(
      `SELECT triggered_at FROM activity_findings WHERE rule_id=$1 AND group_value=$2
       ORDER BY triggered_at DESC LIMIT 1`,
      [rule.ruleId, groupValue],
    );
    if (
      last.rows[0] &&
      event.receivedAt &&
      Date.parse(event.receivedAt) - last.rows[0].triggered_at.getTime() <
        rule.windowMinutes * 60_000
    )
      return;
    await client.query(
      `INSERT INTO activity_findings
       (finding_id,project_id,rule_id,group_value,matched_count,triggered_at,window_start,event_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [
        randomUUID(),
        projectId,
        rule.ruleId,
        groupValue,
        matchedCount,
        event.receivedAt,
        cutoff,
        event.eventId,
      ],
    );
  }

  async search(projectId: string, filters: ActivityFilters) {
    const values: unknown[] = [projectId];
    const where = conditions(filters, values);
    values.push(filters.limit + 1, filters.offset);
    const rows = await this.db.query<{ payload: StoredLog }>(
      `SELECT payload FROM activity_event_index WHERE ${where}
       ORDER BY occurred_at DESC,event_id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    return {
      items: rows.rows.slice(0, filters.limit).map((row) => row.payload),
      nextOffset:
        rows.rows.length > filters.limit
          ? filters.offset + filters.limit
          : null,
    };
  }

  async insights(
    projectId: string,
    filters: Omit<ActivityFilters, 'limit' | 'offset'>,
  ) {
    const values: unknown[] = [projectId];
    const where = conditions(filters, values);
    const totals = await this.db.query<{
      total_logins: string;
      active_days: string;
    }>(
      `SELECT count(*) FILTER (WHERE event_type='auth.login' AND outcome='success')::text AS total_logins,
       count(DISTINCT (occurred_at AT TIME ZONE 'Asia/Bangkok')::date)
       FILTER (WHERE event_type='auth.login' AND outcome='success')::text AS active_days
       FROM activity_event_index WHERE ${where}`,
      values,
    );
    const latest = await this.db.query<{
      client_ip: string | null;
      device_type: string | null;
      occurred_at: Date;
    }>(
      `SELECT client_ip,device_type,occurred_at FROM activity_event_index WHERE ${where}
       AND (client_ip IS NOT NULL OR device_type IS NOT NULL)
       ORDER BY occurred_at DESC,event_id DESC LIMIT 1`,
      values,
    );
    const sessionValues: unknown[] = [projectId, filters.from, filters.to];
    let sessionWhere = 'project_id=$1 AND login_at >= $2 AND login_at < $3';
    if (filters.userId) {
      sessionValues.push(filters.userId);
      sessionWhere += ` AND user_id=$${sessionValues.length}`;
    }
    const sessions = await this.db.query<{
      session_id: string;
      user_id: string | null;
      login_at: Date;
      logout_at: Date | null;
      duration_ms: string | null;
    }>(
      `SELECT session_id,user_id,login_at,logout_at,duration_ms FROM activity_sessions
       WHERE ${sessionWhere} ORDER BY login_at DESC LIMIT 1`,
      sessionValues,
    );
    const session = sessions.rows[0];
    return {
      totalLogins: Number(totals.rows[0]?.total_logins ?? 0),
      activeDays: Number(totals.rows[0]?.active_days ?? 0),
      latestClient: latest.rows[0]
        ? {
            ip: latest.rows[0].client_ip,
            deviceType: latest.rows[0].device_type,
            timestamp: latest.rows[0].occurred_at.toISOString(),
          }
        : null,
      latestSession: session
        ? {
            sessionId: session.session_id,
            userId: session.user_id,
            loginAt: session.login_at.toISOString(),
            logoutAt: session.logout_at?.toISOString() ?? null,
            activeDurationMs:
              session.duration_ms === null ? null : Number(session.duration_ms),
          }
        : null,
    };
  }

  async findings(projectId: string, limit: number, offset: number) {
    const rows = await this.db.query<Row>(
      `SELECT f.finding_id AS "findingId",f.rule_id AS "ruleId",r.name AS "ruleName",
       f.group_value AS "groupValue",f.matched_count AS "matchedCount",
       f.triggered_at AS "triggeredAt",f.window_start AS "windowStart",f.event_id AS "eventId"
       FROM activity_findings f JOIN activity_rules r ON r.rule_id=f.rule_id
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
      "DELETE FROM activity_findings WHERE triggered_at < now() - interval '30 days'",
    );
    await this.db.query(
      "DELETE FROM activity_rule_events WHERE received_at < now() - interval '30 days'",
    );
    await this.db.query(
      "DELETE FROM activity_sessions WHERE login_at < now() - interval '30 days'",
    );
    await this.db.query(
      "DELETE FROM activity_event_index WHERE received_at < now() - interval '30 days'",
    );
  }
}
